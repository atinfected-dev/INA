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
  boss_count: bigint;
  best_per_boss_mean: number;
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
  // Two levels of aggregation on purpose:
  //
  //  `kills`     one row per ranked kill, after filtering
  //  `per_boss`  the best parse per boss and difficulty
  //
  // The second level is what makes "Ø bester Parse je Boss" possible — the
  // figure Warcraft Logs shows on a character page. Averaging over every kill
  // instead answers a different question and lands far lower, so both are
  // computed here and labelled apart in the UI.
  const rows = await prisma.$queryRaw<RawRow[]>`
    WITH kills AS (
      SELECT c.id            AS character_id,
             c.name          AS character_name,
             c."className"   AS class_name,
             c."realmName"   AS realm_name,
             p.id            AS person_id,
             p."displayName" AS person_name,
             e.id            AS encounter_id,
             f."difficultyId" AS difficulty_id,
             pr."rankPercent" AS rank_percent
      FROM "ParseRanking" pr
      JOIN "Character" c       ON c.id = pr."characterId"
      LEFT JOIN "Person" p     ON p.id = c."personId"
      JOIN "Fight" f           ON f.id = pr."fightId"
      LEFT JOIN "Encounter" e  ON e.id = f."encounterId"
      LEFT JOIN "Zone" z       ON z.id = e."zoneId"
      LEFT JOIN "Expansion" x  ON x.id = z."expansionId"
      LEFT JOIN "Difficulty" d ON d.id = f."difficultyId"
      WHERE (${expansionId ?? null}::int IS NULL OR x."wclExpansionId" = ${expansionId ?? null}::int)
        AND (${difficultyId ?? null}::int IS NULL OR d."wclDifficultyId" = ${difficultyId ?? null}::int)
        AND (${metric ?? null}::text IS NULL OR pr.metric::text = ${metric ?? null}::text)
        AND (${className ?? null}::text IS NULL OR c."className" = ${className ?? null}::text)
    ),
    per_boss AS (
      SELECT character_id, encounter_id, difficulty_id, MAX(rank_percent) AS best_parse
      FROM kills
      GROUP BY character_id, encounter_id, difficulty_id
    )
    SELECT k.character_id   AS "characterId",
           k.character_name AS "name",
           k.class_name     AS "className",
           k.realm_name     AS "realmName",
           k.person_id      AS "personId",
           k.person_name    AS "personName",
           COUNT(*)                                                     AS sample_size,
           (SELECT COUNT(*) FROM per_boss b WHERE b.character_id = k.character_id)     AS boss_count,
           (SELECT AVG(b.best_parse) FROM per_boss b WHERE b.character_id = k.character_id) AS best_per_boss_mean,
           MAX(k.rank_percent)                                          AS best,
           AVG(k.rank_percent)                                          AS mean,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY k.rank_percent)  AS median,
           STDDEV_POP(k.rank_percent)                                   AS std_dev,
           COUNT(*) FILTER (WHERE k.rank_percent >= 100) AS c100,
           COUNT(*) FILTER (WHERE k.rank_percent >= 99)  AS c99,
           COUNT(*) FILTER (WHERE k.rank_percent >= 95)  AS c95,
           COUNT(*) FILTER (WHERE k.rank_percent >= 90)  AS c90,
           COUNT(*) FILTER (WHERE k.rank_percent >= 80)  AS c80
    FROM kills k
    GROUP BY k.character_id, k.character_name, k.class_name, k.realm_name,
             k.person_id, k.person_name
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
      bossCount: Number(row.boss_count),
      bestPerBossMean: Number(row.best_per_boss_mean),
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
