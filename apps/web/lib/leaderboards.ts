import { prisma } from '@ina/db';
import type { ParseAggregate } from '@ina/core';

/**
 * Parse aggregation.
 *
 * All figures for a player come from one pass over ParseRanking, so the
 * different leaderboards are guaranteed to be consistent with each other — the
 * average and the "how many 99s" column can never disagree about the same
 * sample.
 *
 * The minimum-sample rule is deliberately NOT applied here. It belongs to the
 * metric (see @ina/core), and the unfiltered list is shown beside the filtered
 * one, so the query must return everyone.
 */

export interface LeaderboardSubject {
  characterId: string;
  name: string;
  className: string | null;
  realmName: string;
  personId: string | null;
  personName: string | null;
}

export interface LeaderboardEntry {
  subject: LeaderboardSubject;
  aggregate: ParseAggregate;
}

export interface LeaderboardFilters {
  /** Warcraft Logs expansion id, e.g. 1004 for Mists of Pandaria. */
  expansionId?: number;
  /** Warcraft Logs difficulty id. */
  difficultyId?: number;
  /** 'DPS' or 'HPS'. */
  metric?: 'DPS' | 'HPS';
  className?: string;
}

interface RawRow {
  characterId: string;
  name: string;
  className: string | null;
  realmName: string;
  personId: string | null;
  personName: string | null;
  sample_size: bigint;
  best: number;
  mean: number;
  median: number;
  std_dev: number | null;
  c100: bigint;
  c99: bigint;
  c95: bigint;
  c90: bigint;
  c80: bigint;
}

export async function loadParseLeaderboard(
  filters: LeaderboardFilters = {},
): Promise<LeaderboardEntry[]> {
  const { expansionId, difficultyId, metric, className } = filters;

  // Prisma's tagged template parameterises every interpolation, so these
  // values cannot be injected even though the query is raw SQL.
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT c.id                AS "characterId",
           c.name              AS "name",
           c."className"       AS "className",
           c."realmName"       AS "realmName",
           p.id                AS "personId",
           p."displayName"     AS "personName",
           COUNT(*)                                                      AS sample_size,
           MAX(pr."rankPercent")                                         AS best,
           AVG(pr."rankPercent")                                         AS mean,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pr."rankPercent")  AS median,
           STDDEV_POP(pr."rankPercent")                                  AS std_dev,
           COUNT(*) FILTER (WHERE pr."rankPercent" >= 100) AS c100,
           COUNT(*) FILTER (WHERE pr."rankPercent" >= 99)  AS c99,
           COUNT(*) FILTER (WHERE pr."rankPercent" >= 95)  AS c95,
           COUNT(*) FILTER (WHERE pr."rankPercent" >= 90)  AS c90,
           COUNT(*) FILTER (WHERE pr."rankPercent" >= 80)  AS c80
    FROM "ParseRanking" pr
    JOIN "Character" c      ON c.id = pr."characterId"
    LEFT JOIN "Person" p    ON p.id = c."personId"
    JOIN "Fight" f          ON f.id = pr."fightId"
    LEFT JOIN "Encounter" e ON e.id = f."encounterId"
    LEFT JOIN "Zone" z      ON z.id = e."zoneId"
    LEFT JOIN "Expansion" x ON x.id = z."expansionId"
    LEFT JOIN "Difficulty" d ON d.id = f."difficultyId"
    WHERE (${expansionId ?? null}::int IS NULL OR x."wclExpansionId" = ${expansionId ?? null}::int)
      AND (${difficultyId ?? null}::int IS NULL OR d."wclDifficultyId" = ${difficultyId ?? null}::int)
      AND (${metric ?? null}::text IS NULL OR pr.metric::text = ${metric ?? null}::text)
      AND (${className ?? null}::text IS NULL OR c."className" = ${className ?? null}::text)
    GROUP BY c.id, c.name, c."className", c."realmName", p.id, p."displayName"
  `;

  return rows.map((row) => ({
    subject: {
      characterId: row.characterId,
      name: row.name,
      className: row.className,
      realmName: row.realmName,
      personId: row.personId,
      personName: row.personName,
    },
    aggregate: {
      sampleSize: Number(row.sample_size),
      best: Number(row.best),
      mean: Number(row.mean),
      median: Number(row.median),
      // A single-kill player has no spread; Postgres returns NULL there.
      stdDev: row.std_dev === null ? 0 : Number(row.std_dev),
      count100: Number(row.c100),
      count99: Number(row.c99),
      count95plus: Number(row.c95),
      count90plus: Number(row.c90),
      count80plus: Number(row.c80),
    },
  }));
}

export interface FilterOptions {
  expansions: { id: number; name: string }[];
  difficulties: { id: number; name: string }[];
  classes: string[];
}

/** Only offers filters that actually match imported data. */
export async function loadFilterOptions(): Promise<FilterOptions> {
  const [expansions, difficulties, classes] = await Promise.all([
    prisma.expansion.findMany({
      where: { zones: { some: { encounters: { some: { fights: { some: {} } } } } } },
      orderBy: { sortOrder: 'desc' },
      select: { wclExpansionId: true, name: true },
    }),
    prisma.difficulty.findMany({
      where: { fights: { some: {} } },
      orderBy: { wclDifficultyId: 'desc' },
      select: { wclDifficultyId: true, name: true },
    }),
    prisma.character.findMany({
      where: { className: { not: null }, rankings: { some: {} } },
      distinct: ['className'],
      orderBy: { className: 'asc' },
      select: { className: true },
    }),
  ]);

  return {
    expansions: expansions.map((e) => ({ id: e.wclExpansionId, name: e.name })),
    difficulties: difficulties.map((d) => ({ id: d.wclDifficultyId, name: d.name })),
    classes: classes
      .map((c) => c.className)
      .filter((c): c is string => c !== null && c !== 'Unknown'),
  };
}
