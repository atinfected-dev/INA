import { prisma } from '@ina/db';

/**
 * Death statistics.
 *
 * One correctness trap governs this whole file: deaths only exist for reports
 * whose contents Warcraft Logs has not archived. Counting deaths over that
 * subset while counting pulls over ALL fights would quietly understate
 * "deaths per pull" for everyone who raided in the archived years — the
 * long-serving raiders, precisely the people the list is about.
 *
 * Both sides therefore count over the same fights: those belonging to a report
 * that still has its contents. The UI says so.
 */

export interface DeathRow {
  characterId: string;
  name: string;
  className: string | null;
  deaths: number;
  pulls: number;
  /** Combat time the player was present for, in milliseconds. */
  activeMs: number;
  deathsPerPull: number;
  deathsPerHour: number;
}

export interface DeathFilters {
  expansionId?: number;
  difficultyId?: number;
  /** Minimum pulls before a normalised rate is trustworthy. */
  minPulls?: number;
}

interface RawDeathRow {
  characterId: string;
  name: string;
  className: string | null;
  deaths: bigint;
  pulls: bigint;
  active_ms: bigint | null;
}

export async function loadDeathLeaderboard(filters: DeathFilters = {}): Promise<DeathRow[]> {
  const { expansionId, difficultyId, minPulls = 0 } = filters;

  const rows = await prisma.$queryRaw<RawDeathRow[]>`
    WITH eligible_fights AS (
      SELECT f.id, f."durationMs"
      FROM "Fight" f
      JOIN "Report" r          ON r.id = f."reportId"
      LEFT JOIN "Encounter" e  ON e.id = f."encounterId"
      LEFT JOIN "Zone" z       ON z.id = e."zoneId"
      LEFT JOIN "Expansion" x  ON x.id = z."expansionId"
      LEFT JOIN "Difficulty" d ON d.id = f."difficultyId"
      -- Only fights whose deaths could actually be imported.
      WHERE r."contentsArchived" = false
        AND (${expansionId ?? null}::int IS NULL OR x."wclExpansionId" = ${expansionId ?? null}::int)
        AND (${difficultyId ?? null}::int IS NULL OR d."wclDifficultyId" = ${difficultyId ?? null}::int)
    ),
    participation AS (
      SELECT p."characterId",
             COUNT(*)                  AS pulls,
             SUM(ef."durationMs")::bigint AS active_ms
      FROM "FightParticipant" p
      JOIN eligible_fights ef ON ef.id = p."fightId"
      GROUP BY p."characterId"
    ),
    deaths AS (
      SELECT de."characterId", COUNT(*) AS deaths
      FROM "DeathEvent" de
      JOIN eligible_fights ef ON ef.id = de."fightId"
      GROUP BY de."characterId"
    )
    SELECT c.id          AS "characterId",
           c.name        AS "name",
           c."className" AS "className",
           COALESCE(d.deaths, 0) AS deaths,
           pa.pulls              AS pulls,
           pa.active_ms          AS active_ms
    FROM participation pa
    JOIN "Character" c   ON c.id = pa."characterId"
    LEFT JOIN deaths d   ON d."characterId" = pa."characterId"
    WHERE pa.pulls >= ${minPulls}
  `;

  return rows.map((row) => {
    const deaths = Number(row.deaths);
    const pulls = Number(row.pulls);
    const activeMs = Number(row.active_ms ?? 0);
    const hours = activeMs / 3_600_000;

    return {
      characterId: row.characterId,
      name: row.name,
      className: row.className,
      deaths,
      pulls,
      activeMs,
      deathsPerPull: pulls === 0 ? 0 : deaths / pulls,
      deathsPerHour: hours === 0 ? 0 : deaths / hours,
    };
  });
}

export interface DeathCause {
  abilityName: string | null;
  deaths: number;
}

/** The abilities that killed the guild most often. */
export async function loadDeathCauses(
  filters: { expansionId?: number; limit?: number } = {},
): Promise<DeathCause[]> {
  const { expansionId, limit = 15 } = filters;

  const rows = await prisma.$queryRaw<{ abilityName: string | null; deaths: bigint }[]>`
    SELECT de."abilityName" AS "abilityName", COUNT(*) AS deaths
    FROM "DeathEvent" de
    JOIN "Fight" f          ON f.id = de."fightId"
    LEFT JOIN "Encounter" e ON e.id = f."encounterId"
    LEFT JOIN "Zone" z      ON z.id = e."zoneId"
    LEFT JOIN "Expansion" x ON x.id = z."expansionId"
    WHERE (${expansionId ?? null}::int IS NULL OR x."wclExpansionId" = ${expansionId ?? null}::int)
    GROUP BY de."abilityName"
    ORDER BY deaths DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({ abilityName: row.abilityName, deaths: Number(row.deaths) }));
}

/** How much of the history actually carries death data. */
export async function loadDeathCoverage(): Promise<{
  reportsWithContents: number;
  reportsArchived: number;
  deaths: number;
  withoutCause: number;
}> {
  const [reportsWithContents, reportsArchived, deaths, withoutCause] = await Promise.all([
    prisma.report.count({ where: { contentsArchived: false } }),
    prisma.report.count({ where: { contentsArchived: true } }),
    prisma.deathEvent.count(),
    prisma.deathEvent.count({ where: { abilityName: null } }),
  ]);

  return { reportsWithContents, reportsArchived, deaths, withoutCause };
}
