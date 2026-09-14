import { prisma } from '@ina/db';

/**
 * Attendance.
 *
 * The denominator is the interesting decision. Measuring against every raid
 * night the guild ever held would punish anyone who joined late or left — a
 * raider who never missed a night in 2026 would still show 20 %. Attendance is
 * therefore measured over a raider's own tenure: the nights that took place
 * between their first and their last appearance.
 *
 * Both guilds count together. The same people raided under both names, and a
 * guild rename is not an absence.
 */

export interface AttendanceRow {
  characterId: string;
  name: string;
  className: string | null;
  attended: number;
  /** Nights held between this raider's first and last appearance. */
  available: number;
  percent: number;
  activeMs: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface AttendanceFilters {
  /** Minimum nights available before a percentage means anything. */
  minAvailable?: number;
  /**
   * Smallest raid that counts as a night.
   *
   * Of 582 nights in this guild's history only 379 were 20-player raids; 193
   * were 10-to-19-player alt and twink runs. Counting those against a main
   * raider measures them on evenings they were never rostered for, which is
   * why the size is a visible choice rather than a hidden constant.
   */
  minRaidSize?: number;
}

export async function loadAttendance(filters: AttendanceFilters = {}): Promise<AttendanceRow[]> {
  const { minAvailable = 20, minRaidSize = 0 } = filters;

  const rows = await prisma.$queryRaw<
    {
      characterId: string;
      name: string;
      className: string | null;
      attended: bigint;
      available: bigint;
      active_ms: bigint;
      first_seen: Date;
      last_seen: Date;
    }[]
  >`
    WITH sized AS (
      SELECT s.id, s."startTime",
             COUNT(*) FILTER (WHERE sa."isPresent") AS raid_size
      FROM "RaidSession" s
      LEFT JOIN "SessionAttendance" sa ON sa."sessionId" = s.id
      GROUP BY s.id, s."startTime"
    ),
    nights AS (
      SELECT id, "startTime" FROM sized WHERE raid_size >= ${minRaidSize}
    ),
    attended AS (
      SELECT sa."characterId",
             n."startTime",
             sa."activeMs"
      FROM "SessionAttendance" sa
      JOIN nights n ON n.id = sa."sessionId"
      WHERE sa."isPresent" = true
    ),
    tenure AS (
      SELECT "characterId",
             COUNT(*)              AS attended,
             SUM("activeMs")::bigint AS active_ms,
             MIN("startTime")      AS first_seen,
             MAX("startTime")      AS last_seen
      FROM attended
      GROUP BY "characterId"
    )
    SELECT t."characterId" AS "characterId",
           c.name          AS "name",
           c."className"   AS "className",
           t.attended      AS attended,
           t.active_ms     AS active_ms,
           t.first_seen    AS first_seen,
           t.last_seen     AS last_seen,
           (
             SELECT COUNT(*)
             FROM nights n
             WHERE n."startTime" >= t.first_seen AND n."startTime" <= t.last_seen
           ) AS available
    FROM tenure t
    JOIN "Character" c ON c.id = t."characterId"
  `;

  return rows
    .map((row) => {
      const attended = Number(row.attended);
      const available = Number(row.available);
      return {
        characterId: row.characterId,
        name: row.name,
        className: row.className,
        attended,
        available,
        percent: available === 0 ? 0 : (attended / available) * 100,
        activeMs: Number(row.active_ms),
        firstSeen: row.first_seen,
        lastSeen: row.last_seen,
      };
    })
    .filter((row) => row.available >= minAvailable);
}

export interface SizeBucket {
  minSize: number;
  label: string;
  sessions: number;
}

/** How many nights each raid-size threshold keeps. */
export async function loadSizeBuckets(): Promise<SizeBucket[]> {
  const rows = await prisma.$queryRaw<{ min_size: number; sessions: bigint }[]>`
    WITH sized AS (
      SELECT s.id, COUNT(*) FILTER (WHERE sa."isPresent") AS raid_size
      FROM "RaidSession" s
      LEFT JOIN "SessionAttendance" sa ON sa."sessionId" = s.id
      GROUP BY s.id
    )
    SELECT t.min_size, COUNT(*) FILTER (WHERE sized.raid_size >= t.min_size) AS sessions
    FROM sized, (VALUES (0), (10), (20)) AS t(min_size)
    GROUP BY t.min_size ORDER BY t.min_size
  `;

  const labels: Record<number, string> = {
    0: 'Alle Abende',
    10: 'ab 10 Spielern',
    20: 'ab 20 Spielern',
  };

  return rows.map((row) => ({
    minSize: row.min_size,
    label: labels[row.min_size] ?? `ab ${row.min_size}`,
    sessions: Number(row.sessions),
  }));
}

export async function loadAttendanceOverview(): Promise<{
  sessions: number;
  firstNight: Date | null;
  lastNight: Date | null;
  combatMs: number;
  multiReportSessions: number;
}> {
  const [aggregate, multiReport] = await Promise.all([
    prisma.raidSession.aggregate({
      _count: true,
      _min: { startTime: true },
      _max: { startTime: true },
      _sum: { durationMs: true },
    }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM (
        SELECT "sessionId" FROM "SessionReport" GROUP BY "sessionId" HAVING COUNT(*) > 1
      ) t
    `,
  ]);

  return {
    sessions: aggregate._count,
    firstNight: aggregate._min.startTime,
    lastNight: aggregate._max.startTime,
    combatMs: aggregate._sum.durationMs ?? 0,
    multiReportSessions: Number(multiReport[0]?.count ?? 0),
  };
}
