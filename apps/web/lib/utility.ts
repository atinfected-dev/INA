import { prisma } from '@ina/db';

/**
 * Interrupt and dispel leaderboards.
 *
 * Counted per PERSON where characters have been merged, like the member pages:
 * splitting a raider's interrupts across four characters would answer a
 * question nobody asked.
 *
 * The source data is per report, not per pull — `table(dataType: Interrupts)`
 * returns no per-fight breakdown, so that is the finest honest granularity
 * (see apps/worker/src/import/interrupts.ts). Every figure here therefore adds
 * up whole raid nights, and "per hour" divides by the combat time a subject
 * actually spent in those same reports.
 */

export type UtilityKind = 'interrupts' | 'dispels';

export const UTILITY_KINDS: Record<
  UtilityKind,
  { label: string; singular: string; description: string }
> = {
  interrupts: {
    label: 'Unterbrechungen',
    singular: 'Unterbrechung',
    description:
      'Gegnerische Zauber, die unterbrochen wurden. Pets zählen für ihren Besitzer — so liefert es Warcraft Logs, und so würde es ein Raider auch erwarten.',
  },
  dispels: {
    label: 'Dispels',
    singular: 'Dispel',
    description:
      'Entfernte Effekte: Dispel, Cleanse, Tranquilizing Shot, Spellsteal — alles, was Warcraft Logs als Dispel führt.',
  },
};

export type UtilityMetric = 'perHour' | 'perNight' | 'total';

export const UTILITY_METRICS: Record<UtilityMetric, { label: string; formula: string }> = {
  perHour: {
    label: 'Je Stunde Kampfzeit',
    formula: 'Geteilt durch die Kampfzeit, die in denselben Logs verbracht wurde.',
  },
  perNight: {
    label: 'Je Raidabend',
    formula: 'Geteilt durch die Zahl der Logs, in denen überhaupt etwas zustande kam.',
  },
  total: {
    label: 'Gesamt',
    formula: 'Summe über die gesamte Historie. Belohnt vor allem Ausdauer.',
  },
};

export interface UtilityRow {
  subjectId: string;
  name: string;
  className: string | null;
  role: string | null;
  interrupts: number;
  dispels: number;
  /** Logs in which this subject interrupted or dispelled at least once. */
  reports: number;
  combatMs: number;
}

export interface UtilityFilters {
  expansionId?: number;
  role?: string;
  /** Below this many logs an average says nothing. */
  minReports?: number;
}

export const DEFAULT_MIN_REPORTS = 20;

export async function loadUtility(filters: UtilityFilters = {}): Promise<UtilityRow[]> {
  const { expansionId, role, minReports = DEFAULT_MIN_REPORTS } = filters;

  const rows = await prisma.$queryRaw<
    {
      subject_id: string;
      name: string;
      class_name: string | null;
      role: string | null;
      interrupts: bigint;
      dispels: bigint;
      reports: bigint;
      combat_ms: bigint;
    }[]
  >`
    WITH subjects AS (
      SELECT c.id                              AS character_id,
             COALESCE(c."personId", c.id)      AS subject_id,
             COALESCE(p."displayName", c.name) AS subject_name,
             c."className"                     AS class_name
      FROM "Character" c
      LEFT JOIN "Person" p ON p.id = c."personId"
    ),
    scoped AS (
      SELECT s.subject_id,
             s.character_id,
             ru."reportId"   AS report_id,
             ru.interrupts   AS interrupts,
             ru.dispels      AS dispels
      FROM "ReportUtility" ru
      JOIN subjects s         ON s.character_id = ru."characterId"
      JOIN "Report" r         ON r.id = ru."reportId"
      LEFT JOIN "Zone" z      ON z.id = r."zoneId"
      LEFT JOIN "Expansion" x ON x.id = z."expansionId"
      WHERE (${expansionId ?? null}::int IS NULL OR x."wclExpansionId" = ${expansionId ?? null}::int)
    ),
    -- Combat time in exactly the reports that contributed, so the rate has the
    -- same scope as the count it divides.
    clock AS (
      SELECT sc.subject_id, SUM(f."durationMs")::bigint AS combat_ms
      FROM (SELECT DISTINCT subject_id, character_id, report_id FROM scoped) sc
      JOIN "Fight" f            ON f."reportId" = sc.report_id
      JOIN "FightParticipant" fp ON fp."fightId" = f.id AND fp."characterId" = sc.character_id
      GROUP BY sc.subject_id
    ),
    -- The role a subject mostly played, for the filter.
    roles AS (
      SELECT s.subject_id, MODE() WITHIN GROUP (ORDER BY fp.role) AS role
      FROM "FightPerformance" fp
      JOIN subjects s ON s.character_id = fp."characterId"
      WHERE fp.role IS NOT NULL
      GROUP BY s.subject_id
    )
    SELECT sc.subject_id,
           MIN(s.subject_name)                        AS name,
           MODE() WITHIN GROUP (ORDER BY s.class_name) AS class_name,
           MAX(ro.role)                               AS role,
           SUM(sc.interrupts)::bigint                 AS interrupts,
           SUM(sc.dispels)::bigint                    AS dispels,
           COUNT(DISTINCT sc.report_id)               AS reports,
           COALESCE(MAX(cl.combat_ms), 0)             AS combat_ms
    FROM scoped sc
    JOIN subjects s      ON s.character_id = sc.character_id
    LEFT JOIN clock cl   ON cl.subject_id = sc.subject_id
    LEFT JOIN roles ro   ON ro.subject_id = sc.subject_id
    GROUP BY sc.subject_id
    HAVING COUNT(DISTINCT sc.report_id) >= ${minReports}
       AND (${role ?? null}::text IS NULL OR MAX(ro.role) = ${role ?? null}::text)
  `;

  return rows.map((row) => ({
    subjectId: row.subject_id,
    name: row.name,
    className: row.class_name,
    role: row.role,
    interrupts: Number(row.interrupts),
    dispels: Number(row.dispels),
    reports: Number(row.reports),
    combatMs: Number(row.combat_ms),
  }));
}

export function utilityValue(row: UtilityRow, kind: UtilityKind, metric: UtilityMetric): number {
  const count = kind === 'interrupts' ? row.interrupts : row.dispels;
  if (metric === 'total') return count;
  if (metric === 'perNight') return row.reports === 0 ? 0 : count / row.reports;
  return row.combatMs === 0 ? 0 : count / (row.combatMs / 3_600_000);
}

export interface UtilityTotals {
  interrupts: number;
  dispels: number;
  reports: number;
}

export async function loadUtilityTotals(): Promise<UtilityTotals> {
  const rows = await prisma.$queryRaw<{ interrupts: bigint; dispels: bigint; reports: bigint }[]>`
    SELECT COALESCE(SUM(interrupts), 0)::bigint AS interrupts,
           COALESCE(SUM(dispels), 0)::bigint    AS dispels,
           COUNT(DISTINCT "reportId")           AS reports
    FROM "ReportUtility"
  `;

  return {
    interrupts: Number(rows[0]?.interrupts ?? 0),
    dispels: Number(rows[0]?.dispels ?? 0),
    reports: Number(rows[0]?.reports ?? 0),
  };
}
