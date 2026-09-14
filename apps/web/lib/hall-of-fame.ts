import { prisma } from '@ina/db';
import type { HallOfFameTitle } from '@ina/core';

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
  unit: 'count' | 'amount' | 'percentile';
  /** Set when the metric cannot be answered from imported data. */
  unavailable?: string;
}

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
