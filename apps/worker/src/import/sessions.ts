import { prisma, type Guild, type Prisma } from '@ina/db';
import { DEFAULT_SETTINGS, SETTINGS_KEY, type AppSettings } from '@ina/core';

/**
 * Builds raid nights and attendance.
 *
 * Sessions are cut from the stream of FIGHTS, not from report boundaries, and
 * this is the whole point. Report boundaries are unreliable in both directions:
 *
 *  * one night is often split across several reports, and
 *  * one report sometimes spans days — the longest in this guild's history
 *    covers 121 hours with 36 minutes of combat, because a logger was left
 *    running.
 *
 * Grouping fights by the gap between them handles both. The threshold is not a
 * guess: across this guild's history 13.573 gaps are under 30 minutes and 576
 * exceed 12 hours, with barely anything in between, so any cut between those
 * two clusters produces the same nights.
 */

export interface SessionsResult {
  sessions: number;
  attendanceRows: number;
  presentRows: number;
  /** Nights assembled from more than one report. */
  multiReportSessions: number;
  /** Reports that turned out to contain more than one night. */
  splitReports: number;
}

interface FightRow {
  id: string;
  reportId: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

interface Session {
  start: Date;
  end: Date;
  combatMs: number;
  fightIds: string[];
  reportIds: Set<string>;
}

async function loadSettings(): Promise<AppSettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row || typeof row.value !== 'object' || row.value === null || Array.isArray(row.value)) {
    return DEFAULT_SETTINGS;
  }
  return { ...DEFAULT_SETTINGS, ...(row.value as Partial<AppSettings>) };
}

/** Cuts the ordered fight stream wherever the gap exceeds the threshold. */
export function groupFightsIntoSessions(fights: FightRow[], gapMs: number): Session[] {
  const sessions: Session[] = [];
  let current: Session | null = null;

  for (const fight of fights) {
    if (current === null || fight.startTime.getTime() - current.end.getTime() > gapMs) {
      current = {
        start: fight.startTime,
        end: fight.endTime,
        combatMs: 0,
        fightIds: [],
        reportIds: new Set(),
      };
      sessions.push(current);
    }

    current.fightIds.push(fight.id);
    current.reportIds.add(fight.reportId);
    current.combatMs += fight.durationMs;
    // Fights are ordered by start, but a long pull can still end after the
    // next one starts; keep the furthest end seen.
    if (fight.endTime > current.end) current.end = fight.endTime;
  }

  return sessions;
}

export async function rebuildSessions(
  guild: Pick<Guild, 'id' | 'name'>,
): Promise<SessionsResult> {
  const settings = await loadSettings();
  const gapMs = settings.sessionGapHours * 3_600_000;
  const minActiveMs = settings.attendanceMinMinutes * 60_000;
  const minParticipation = settings.attendanceMinParticipation;

  const fights = await prisma.fight.findMany({
    where: { report: { guildId: guild.id } },
    orderBy: { startTime: 'asc' },
    select: { id: true, reportId: true, startTime: true, endTime: true, durationMs: true },
  });

  const sessions = groupFightsIntoSessions(fights, gapMs);

  // Rebuilt from scratch: thresholds change, and a stale session would keep
  // reporting attendance under the old rule.
  await prisma.raidSession.deleteMany({ where: { guildId: guild.id } });

  const result: SessionsResult = {
    sessions: sessions.length,
    attendanceRows: 0,
    presentRows: 0,
    multiReportSessions: 0,
    splitReports: 0,
  };

  const reportSessionCount = new Map<string, number>();

  for (const session of sessions) {
    if (session.reportIds.size > 1) result.multiReportSessions += 1;
    for (const reportId of session.reportIds) {
      reportSessionCount.set(reportId, (reportSessionCount.get(reportId) ?? 0) + 1);
    }

    const row = await prisma.raidSession.create({
      data: {
        guildId: guild.id,
        date: new Date(
          Date.UTC(
            session.start.getUTCFullYear(),
            session.start.getUTCMonth(),
            session.start.getUTCDate(),
          ),
        ),
        startTime: session.start,
        endTime: session.end,
        // Combat time, not wall clock: the span of a night says little when a
        // logger keeps running through the night.
        durationMs: session.combatMs,
        reports: {
          create: [...session.reportIds].map((reportId) => ({ reportId })),
        },
      },
      select: { id: true },
    });

    // Per-character combat time within this session.
    const participation = await prisma.$queryRaw<
      { characterId: string; personId: string | null; active_ms: bigint }[]
    >`
      SELECT p."characterId"          AS "characterId",
             c."personId"             AS "personId",
             SUM(f."durationMs")::bigint AS active_ms
      FROM "FightParticipant" p
      JOIN "Fight" f     ON f.id = p."fightId"
      JOIN "Character" c ON c.id = p."characterId"
      WHERE p."fightId" = ANY(${session.fightIds}::text[])
      GROUP BY p."characterId", c."personId"
    `;

    const rows: Prisma.SessionAttendanceCreateManyInput[] = participation.map((entry) => {
      const activeMs = Number(entry.active_ms);
      const share = session.combatMs === 0 ? 0 : activeMs / session.combatMs;
      // Either threshold suffices. A short night and a long one need different
      // yardsticks: 30 minutes is a real showing on a two-hour night and a
      // cameo on an eight-hour one, and the share catches the reverse.
      const isPresent = activeMs >= minActiveMs || share >= minParticipation;
      if (isPresent) result.presentRows += 1;

      return {
        sessionId: row.id,
        characterId: entry.characterId,
        personId: entry.personId,
        activeMs,
        participation: share,
        isPresent,
      };
    });

    if (rows.length > 0) {
      await prisma.sessionAttendance.createMany({ data: rows });
      result.attendanceRows += rows.length;
    }
  }

  result.splitReports = [...reportSessionCount.values()].filter((count) => count > 1).length;
  return result;
}
