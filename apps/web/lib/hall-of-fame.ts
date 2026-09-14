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
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
    `,
  },
  'parse.best': {
    unit: 'percentile',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", MAX(pr."rankPercent") AS value
      FROM "ParseRanking" pr JOIN "Character" c ON c.id = pr."characterId"
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
    `,
  },
  'deaths.total': {
    unit: 'count',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", COUNT(*)::float AS value
      FROM "DeathEvent" de JOIN "Character" c ON c.id = de."characterId"
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
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
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
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
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
    `,
  },
  'attendance.nights': {
    unit: 'count',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", COUNT(DISTINCT f."reportId")::float AS value
      FROM "FightParticipant" p
      JOIN "Character" c ON c.id = p."characterId"
      JOIN "Fight" f     ON f.id = p."fightId"
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
    `,
  },
  'damage.total': {
    unit: 'amount',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", SUM(fp."damageDone")::float AS value
      FROM "FightPerformance" fp JOIN "Character" c ON c.id = fp."characterId"
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
    `,
  },
  'healing.total': {
    unit: 'amount',
    run: () => prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", SUM(fp."healingDone")::float AS value
      FROM "FightPerformance" fp JOIN "Character" c ON c.id = fp."characterId"
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
    `,
  },
};

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
          unit: 'count',
          unavailable: `Für "${title.metric}" sind noch keine Daten importiert.`,
        };
      }

      const [row] = await loader.run();
      return {
        title,
        name: row?.name ?? null,
        className: row?.className ?? null,
        value: row?.value ?? null,
        unit: loader.unit,
      };
    }),
  );
}
