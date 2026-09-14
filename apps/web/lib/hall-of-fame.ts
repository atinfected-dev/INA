import { prisma } from '@ina/db';
import { METRICS, type HallOfFameTitle } from '@ina/core';

/**
 * Hall of Fame holders.
 *
 * Titles are configuration, not code: the settings row decides which metric
 * each title is awarded for, so renaming "Floor Inspector" or awarding it for
 * something else never needs a deploy.
 *
 * A metric with no query behind it yields `null` and the page says so. Silently
 * dropping such a title would make the page look complete when it is not.
 */

export interface HallOfFameHolder {
  title: HallOfFameTitle;
  name: string | null;
  className: string | null;
  value: number | null;
  /**
   * Everyone sharing the top value, this holder included.
   *
   * Some metrics tie broadly — 29 characters have hit a parse of 100 — and
   * picking one of them by sort order would award a title at random. The page
   * names the tie instead.
   */
  tiedWith: { name: string; className: string | null }[];
  /** How the number is formatted for display. */
  unit: 'count' | 'amount' | 'percentile' | 'percent';
  /** Set when the metric cannot be answered from imported data. */
  unavailable?: string;
}

/**
 * Shared with the attendance page. Both numbers answer the same question, so
 * they must use the same thresholds.
 */
export const MAIN_RAID_SIZE = 20;
export const MIN_NIGHTS_FOR_TITLE = 20;

interface HolderRow {
  name: string;
  className: string | null;
  value: number;
}

type Loader = { unit: HallOfFameHolder['unit']; run: () => Promise<HolderRow[]> };

const LOADERS: Record<string, Loader> = {
  'parse.count99plus': {
    unit: 'count',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", COUNT(*)::float AS value
      FROM "ParseRanking" pr JOIN "Character" c ON c.id = pr."characterId"
      WHERE pr."rankPercent" >= 99
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 12
    `,
  },
  'parse.count100': {
    unit: 'count',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", COUNT(*)::float AS value
      FROM "ParseRanking" pr JOIN "Character" c ON c.id = pr."characterId"
      WHERE pr."rankPercent" >= 100
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 12
    `,
  },
  'parse.best': {
    unit: 'percentile',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", MAX(pr."rankPercent") AS value
      FROM "ParseRanking" pr JOIN "Character" c ON c.id = pr."characterId"
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 12
    `,
  },
  'deaths.total': {
    unit: 'count',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", COUNT(*)::float AS value
      FROM "DeathEvent" de JOIN "Character" c ON c.id = de."characterId"
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 12
    `,
  },
  'wipes.total': {
    unit: 'count',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", COUNT(*)::float AS value
      FROM "FightParticipant" p
      JOIN "Character" c ON c.id = p."characterId"
      JOIN "Fight" f     ON f.id = p."fightId"
      WHERE f.kill = false
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 12
    `,
  },
  'kills.total': {
    unit: 'count',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", COUNT(*)::float AS value
      FROM "FightParticipant" p
      JOIN "Character" c ON c.id = p."characterId"
      JOIN "Fight" f     ON f.id = p."fightId"
      WHERE f.kill = true
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 12
    `,
  },
  'attendance.nights': {
    unit: 'count',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", COUNT(DISTINCT f."reportId")::float AS value
      FROM "FightParticipant" p
      JOIN "Character" c ON c.id = p."characterId"
      JOIN "Fight" f     ON f.id = p."fightId"
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 12
    `,
  },
  'attendance.percent': {
    unit: 'percent',
    /*
     * Must match the attendance page exactly, including the main-raid filter.
     *
     * Without it the title went to a different raider than the one topping the
     * table: alt and twink nights are counted as missed, which costs everyone
     * roughly fifteen points and reorders the ranking. A Hall of Fame that
     * contradicts its own leaderboard is worse than no Hall of Fame.
     */
    run: () => prisma.$queryRaw<HolderRow[]>`
      WITH sized AS (
        SELECT s.id, s."startTime",
               COUNT(*) FILTER (WHERE sa."isPresent") AS raid_size
        FROM "RaidSession" s
        LEFT JOIN "SessionAttendance" sa ON sa."sessionId" = s.id
        GROUP BY s.id, s."startTime"
      ),
      nights AS (
        SELECT id, "startTime" FROM sized WHERE raid_size >= ${MAIN_RAID_SIZE}
      ),
      attended AS (
        SELECT sa."characterId", n."startTime"
        FROM "SessionAttendance" sa
        JOIN nights n ON n.id = sa."sessionId"
        WHERE sa."isPresent" = true
      ),
      tenure AS (
        SELECT "characterId", COUNT(*) AS attended,
               MIN("startTime") AS first_seen, MAX("startTime") AS last_seen
        FROM attended GROUP BY "characterId"
      ),
      scored AS (
        SELECT t."characterId", t.attended,
               (SELECT COUNT(*) FROM nights n
                WHERE n."startTime" >= t.first_seen AND n."startTime" <= t.last_seen) AS available
        FROM tenure t
      )
      SELECT c.name, c."className",
             (s.attended::float / NULLIF(s.available, 0)) * 100 AS value
      FROM scored s
      JOIN "Character" c ON c.id = s."characterId"
      WHERE s.available >= ${MIN_NIGHTS_FOR_TITLE}
      ORDER BY value DESC LIMIT 12
    `,
  },
  'damage.total': {
    unit: 'amount',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", SUM(fp."damageDone")::float AS value
      FROM "FightPerformance" fp JOIN "Character" c ON c.id = fp."characterId"
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 12
    `,
  },
  'healing.total': {
    unit: 'amount',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", SUM(fp."healingDone")::float AS value
      FROM "FightPerformance" fp JOIN "Character" c ON c.id = fp."characterId"
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 12
    `,
  },
};

/**
 * Everyone sharing the top value.
 *
 * Extracted so the rule can be tested without a database: it is the part that
 * decides whether a title is awarded to one person or shown as shared, and
 * getting it wrong hands out a title at random.
 */
export function topHolders<T extends { value: number }>(rows: readonly T[]): T[] {
  const top = rows[0];
  if (top === undefined) return [];
  return rows.filter((row) => row.value === top.value);
}

/**
 * The metrics a title can be awarded for: exactly the ones with a query
 * behind them. Offered to officers as a list, so a title can never name a
 * metric this page cannot answer.
 */
export const HALL_OF_FAME_METRICS: { key: string; label: string; unit: HallOfFameHolder['unit'] }[] =
  Object.entries(LOADERS).map(([key, loader]) => ({
    key,
    label: METRICS[key]?.label ?? key,
    unit: loader.unit,
  }));

export async function loadHallOfFame(titles: HallOfFameTitle[]): Promise<HallOfFameHolder[]> {
  return Promise.all(
    titles.map(async (title): Promise<HallOfFameHolder> => {
      const loader = LOADERS[title.metric];

      if (!loader) {
        return {
          title,
          name: null,
          className: null,
          value: null,
          tiedWith: [],
          unit: 'count',
          unavailable: `Für "${title.metric}" sind noch keine Daten importiert.`,
        };
      }

      const rows = await loader.run();
      const tied = topHolders(rows);
      const top = tied[0];

      return {
        title,
        name: top?.name ?? null,
        className: top?.className ?? null,
        value: top?.value ?? null,
        tiedWith: tied.map((row) => ({ name: row.name, className: row.className })),
        unit: loader.unit,
      };
    }),
  );
}
