import { prisma } from '@ina/db';
import { SCRIPTED_DAMAGE_THRESHOLD } from '@ina/core';
import { keyOf, memo } from './cache';

/**
 * Damage taken.
 *
 * Two decisions carry this list, and both are visible in the UI rather than
 * buried here:
 *
 *  1. Only pulls whose damage taken was actually imported are counted. A pull
 *     that has not been through the importer yet stores a zero, and counting
 *     those would silently dilute every average — the one way this list could
 *     lie without anyone noticing.
 *
 *  2. Pulls containing a scripted instant kill are dropped (see @ina/core).
 *
 * The per-minute denominator is the length of the pulls a raider took part in,
 * not their own active time. Damage taken is a function of being in the room:
 * someone who dies early is exposed for less of the pull, and measuring them
 * against their own shortened clock would reward dying.
 */

export interface DamageTakenRow {
  characterId: string;
  name: string;
  className: string | null;
  role: string | null;
  total: number;
  pulls: number;
  durationMs: number;
  perPull: number;
  perMinute: number;
  /** Largest single pull that survived the scripted-damage rule. */
  worstPull: number;
}

export interface DamageTakenFilters {
  expansionId?: number;
  difficultyId?: number;
  role?: string;
  /** Below this many pulls a per-pull average is noise. */
  minPulls?: number;
}

export const DEFAULT_MIN_PULLS = 50;

interface RawRow {
  characterId: string;
  name: string;
  className: string | null;
  role: string | null;
  total: bigint;
  pulls: bigint;
  duration_ms: bigint;
  worst: bigint;
}

async function computeDamageTaken(
  filters: DamageTakenFilters = {},
): Promise<DamageTakenRow[]> {
  const { expansionId, difficultyId, role, minPulls = DEFAULT_MIN_PULLS } = filters;

  const rows = await prisma.$queryRaw<RawRow[]>`
    WITH pulls AS (
      SELECT fp."characterId"  AS character_id,
             fp."damageTaken"  AS taken,
             fp.role           AS role,
             f."durationMs"    AS duration_ms
      FROM "FightPerformance" fp
      JOIN "Fight" f           ON f.id = fp."fightId"
      LEFT JOIN "Encounter" e  ON e.id = f."encounterId"
      LEFT JOIN "Zone" z       ON z.id = e."zoneId"
      LEFT JOIN "Expansion" x  ON x.id = z."expansionId"
      LEFT JOIN "Difficulty" d ON d.id = f."difficultyId"
      WHERE f."damageTakenImported" = true
        AND fp."damageTaken" < ${BigInt(SCRIPTED_DAMAGE_THRESHOLD)}
        AND (${expansionId ?? null}::int IS NULL OR x."wclExpansionId" = ${expansionId ?? null}::int)
        AND (${difficultyId ?? null}::int IS NULL OR d."wclDifficultyId" = ${difficultyId ?? null}::int)
        AND (${role ?? null}::text IS NULL OR fp.role = ${role ?? null}::text)
    )
    SELECT p.character_id AS "characterId",
           c.name         AS "name",
           c."className"  AS "className",
           MODE() WITHIN GROUP (ORDER BY p.role) AS "role",
           SUM(p.taken)::bigint       AS total,
           COUNT(*)                   AS pulls,
           SUM(p.duration_ms)::bigint AS duration_ms,
           MAX(p.taken)               AS worst
    FROM pulls p
    JOIN "Character" c ON c.id = p.character_id
    GROUP BY p.character_id, c.name, c."className"
    HAVING COUNT(*) >= ${minPulls}
  `;

  return rows.map((row) => {
    const total = Number(row.total);
    const pulls = Number(row.pulls);
    const durationMs = Number(row.duration_ms);
    return {
      characterId: row.characterId,
      name: row.name,
      className: row.className,
      role: row.role,
      total,
      pulls,
      durationMs,
      perPull: pulls === 0 ? 0 : total / pulls,
      perMinute: durationMs === 0 ? 0 : total / (durationMs / 60_000),
      worstPull: Number(row.worst),
    };
  });
}

export interface DamageTakenCoverage {
  /** Pulls whose damage taken has been imported. */
  importedFights: number;
  /** Pulls still waiting for the importer. */
  pendingFights: number;
  /** Player-pulls dropped by the scripted-damage rule. */
  excludedRows: number;
  /** Players affected by that rule. */
  excludedCharacters: number;
  /** Largest single pull still counted. */
  worstRealPull: number;
}

/**
 * What the list is standing on. Shown above it, because a leaderboard built on
 * a partial import looks exactly like one built on a complete one.
 */
export async function loadDamageTakenCoverage(): Promise<DamageTakenCoverage> {
  const [fights, excluded, worst] = await Promise.all([
    prisma.$queryRaw<{ imported: bigint; pending: bigint }[]>`
      SELECT COUNT(*) FILTER (WHERE f."damageTakenImported")     AS imported,
             COUNT(*) FILTER (WHERE NOT f."damageTakenImported") AS pending
      FROM "Fight" f
      JOIN "Report" r ON r.id = f."reportId"
      WHERE r."contentsArchived" = false
    `,
    prisma.$queryRaw<{ rows: bigint; chars: bigint }[]>`
      SELECT COUNT(*) AS rows, COUNT(DISTINCT "characterId") AS chars
      FROM "FightPerformance"
      WHERE "damageTaken" >= ${BigInt(SCRIPTED_DAMAGE_THRESHOLD)}
    `,
    prisma.$queryRaw<{ worst: bigint | null }[]>`
      SELECT MAX(fp."damageTaken") AS worst
      FROM "FightPerformance" fp
      JOIN "Fight" f ON f.id = fp."fightId"
      WHERE f."damageTakenImported" = true
        AND fp."damageTaken" < ${BigInt(SCRIPTED_DAMAGE_THRESHOLD)}
    `,
  ]);

  return {
    importedFights: Number(fights[0]?.imported ?? 0),
    pendingFights: Number(fights[0]?.pending ?? 0),
    excludedRows: Number(excluded[0]?.rows ?? 0),
    excludedCharacters: Number(excluded[0]?.chars ?? 0),
    worstRealPull: Number(worst[0]?.worst ?? 0),
  };
}

export function loadDamageTaken(
  filters: DamageTakenFilters = {},
): Promise<DamageTakenRow[]> {
  return memo(keyOf('damage-taken', filters), () => computeDamageTaken(filters));
}
