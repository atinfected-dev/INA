import { prisma } from '@ina/db';
import type { SubjectMetrics } from '@ina/core';
import { loadSubjectMetrics, type SubjectRow } from './achievement-metrics';
import { MAIN_RAID_SIZE, MIN_NIGHTS_FOR_TITLE } from './hall-of-fame';

/**
 * Guild members.
 *
 * A member is a SUBJECT: the person where characters have been merged into
 * one, the character itself where they have not. Everything on these pages is
 * summed across the whole subject — one raider, one history, however many
 * characters they levelled.
 *
 * The metrics come from the same pass the achievements use, so a member page
 * and an achievement can never disagree about how many pulls someone has.
 */

export const MEMBER_MIN_NIGHTS = MIN_NIGHTS_FOR_TITLE;

export interface MemberRow {
  subjectId: string;
  kind: 'person' | 'character';
  name: string;
  className: string | null;
  characters: number;
  metrics: SubjectMetrics;
}

export interface MemberList {
  members: MemberRow[];
  /** Subjects in the database, including every stranger and one-night alt. */
  total: number;
  minNights: number;
}

function toRow(row: SubjectRow): MemberRow {
  return {
    subjectId: row.subjectId,
    kind: row.kind,
    name: row.name,
    className: row.className,
    characters: row.characterIds.length,
    metrics: row.metrics,
  };
}

/**
 * Members with at least `minNights` raid nights.
 *
 * The threshold is the difference between a guild roster and a list of
 * everyone Warcraft Logs ever saw standing next to the raid: the database
 * holds over two thousand characters, of which a few hundred ever raided here
 * more than once.
 */
export async function loadMembers(minNights = MEMBER_MIN_NIGHTS): Promise<MemberList> {
  const subjects = await loadSubjectMetrics();

  const members = subjects
    .filter((row) => row.metrics.nights >= minNights)
    .map(toRow)
    .sort((a, b) => b.metrics.nights - a.metrics.nights || b.metrics.pulls - a.metrics.pulls);

  return { members, total: subjects.length, minNights };
}

export interface MemberCharacter {
  id: string;
  name: string;
  realmName: string;
  className: string | null;
  pulls: number;
  kills: number;
  combatMs: number;
  firstSeen: Date | null;
  lastSeen: Date | null;
}

export interface MemberProfile {
  subjectId: string;
  kind: 'person' | 'character';
  name: string;
  className: string | null;
  metrics: SubjectMetrics;
  characters: MemberCharacter[];
  /** Attendance over the subject's own tenure, in percent. */
  attendancePercent: number;
  attendedNights: number;
  availableNights: number;
  firstSeen: Date | null;
  lastSeen: Date | null;
}

export async function loadMember(subjectId: string): Promise<MemberProfile | null> {
  const subjects = await loadSubjectMetrics();
  const subject = subjects.find((row) => row.subjectId === subjectId);
  if (!subject) return null;

  const [characters, attendance] = await Promise.all([
    prisma.$queryRaw<
      {
        id: string;
        name: string;
        realm_name: string;
        class_name: string | null;
        pulls: bigint;
        kills: bigint;
        combat_ms: bigint;
        first_seen: Date | null;
        last_seen: Date | null;
      }[]
    >`
      SELECT c.id,
             c.name,
             c."realmName"  AS realm_name,
             c."className"  AS class_name,
             COUNT(fp.id)   AS pulls,
             COUNT(fp.id) FILTER (WHERE f.kill AND f."encounterId" IS NOT NULL) AS kills,
             COALESCE(SUM(f."durationMs"), 0)::bigint AS combat_ms,
             MIN(f."startTime") AS first_seen,
             MAX(f."startTime") AS last_seen
      FROM "Character" c
      LEFT JOIN "FightParticipant" fp ON fp."characterId" = c.id
      LEFT JOIN "Fight" f             ON f.id = fp."fightId"
      WHERE COALESCE(c."personId", c.id) = ${subjectId}
      GROUP BY c.id, c.name, c."realmName", c."className"
      ORDER BY pulls DESC
    `,

    // Attendance over the subject's own tenure, measured against main-raid
    // nights — the same rule and the same raid size the attendance page uses,
    // so the two pages cannot disagree.
    prisma.$queryRaw<{ attended: bigint; available: bigint }[]>`
      WITH sized AS (
        SELECT s.id, s."startTime", COUNT(*) FILTER (WHERE sa."isPresent") AS raid_size
        FROM "RaidSession" s
        LEFT JOIN "SessionAttendance" sa ON sa."sessionId" = s.id
        GROUP BY s.id, s."startTime"
      ),
      nights AS (
        SELECT id, "startTime" FROM sized WHERE raid_size >= ${MAIN_RAID_SIZE}
      ),
      mine AS (
        SELECT n."startTime"
        FROM "SessionAttendance" sa
        JOIN "Character" c ON c.id = sa."characterId"
        JOIN nights n      ON n.id = sa."sessionId"
        WHERE sa."isPresent" AND COALESCE(c."personId", c.id) = ${subjectId}
        GROUP BY n."startTime"
      )
      SELECT (SELECT COUNT(*) FROM mine) AS attended,
             (SELECT COUNT(*) FROM nights n
              WHERE n."startTime" >= (SELECT MIN("startTime") FROM mine)
                AND n."startTime" <= (SELECT MAX("startTime") FROM mine)) AS available
    `,
  ]);

  const attended = Number(attendance[0]?.attended ?? 0);
  const available = Number(attendance[0]?.available ?? 0);

  const rows: MemberCharacter[] = characters.map((row) => ({
    id: row.id,
    name: row.name,
    realmName: row.realm_name,
    className: row.class_name,
    pulls: Number(row.pulls),
    kills: Number(row.kills),
    combatMs: Number(row.combat_ms),
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
  }));

  const seen = rows.filter((row) => row.firstSeen !== null);

  return {
    subjectId: subject.subjectId,
    kind: subject.kind,
    name: subject.name,
    className: subject.className,
    metrics: subject.metrics,
    characters: rows,
    attendancePercent: available === 0 ? 0 : (attended / available) * 100,
    attendedNights: attended,
    availableNights: available,
    firstSeen:
      seen.length === 0
        ? null
        : seen.reduce((min, row) => (row.firstSeen! < min ? row.firstSeen! : min), seen[0]!.firstSeen!),
    lastSeen:
      seen.length === 0
        ? null
        : seen.reduce((max, row) => (row.lastSeen! > max ? row.lastSeen! : max), seen[0]!.lastSeen!),
  };
}
