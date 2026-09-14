import { prisma } from '@ina/db';

/**
 * Player data for the index and the profile pages.
 *
 * Everything is keyed on a character. The Person layer sits on top: once a
 * character is claimed, its profile also shows the person's other characters,
 * so a raider who switched mains keeps one continuous history.
 *
 * Real names are never selected here. The profile page decides whether the
 * viewer may see them, and an unauthenticated render must not even have the
 * value in its payload.
 */

export interface PlayerIndexRow {
  characterId: string;
  name: string;
  realmName: string;
  className: string | null;
  pulls: number;
  kills: number;
  raidNights: number;
  lastSeenAt: Date | null;
  /** Set once the character has been claimed and confirmed. */
  personId: string | null;
}

export async function loadPlayerIndex(): Promise<PlayerIndexRow[]> {
  const rows = await prisma.$queryRaw<
    {
      characterId: string;
      name: string;
      realmName: string;
      className: string | null;
      personId: string | null;
      pulls: bigint;
      kills: bigint;
      raid_nights: bigint;
      lastSeenAt: Date | null;
    }[]
  >`
    SELECT c.id          AS "characterId",
           c.name        AS "name",
           c."realmName" AS "realmName",
           c."className" AS "className",
           c."personId"  AS "personId",
           c."lastSeenAt" AS "lastSeenAt",
           COUNT(*)                            AS pulls,
           COUNT(*) FILTER (WHERE f.kill)      AS kills,
           COUNT(DISTINCT f."reportId")        AS raid_nights
    FROM "FightParticipant" p
    JOIN "Character" c ON c.id = p."characterId"
    JOIN "Fight" f     ON f.id = p."fightId"
    GROUP BY c.id, c.name, c."realmName", c."className", c."personId", c."lastSeenAt"
    ORDER BY pulls DESC
  `;

  return rows.map((row) => ({
    characterId: row.characterId,
    name: row.name,
    realmName: row.realmName,
    className: row.className,
    personId: row.personId,
    lastSeenAt: row.lastSeenAt,
    pulls: Number(row.pulls),
    kills: Number(row.kills),
    raidNights: Number(row.raid_nights),
  }));
}

export interface EncounterLine {
  boss: string;
  difficulty: string | null;
  kills: number;
  pulls: number;
  bestParse: number | null;
  averageParse: number | null;
}

export interface DeathCauseLine {
  abilityName: string | null;
  deaths: number;
}

export interface PlayerProfile {
  characterId: string;
  name: string;
  realmName: string;
  region: string;
  className: string | null;
  mainSpec: string | null;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  person: { id: string; displayName: string; slug: string } | null;
  /** Other characters of the same person, this one excluded. */
  siblings: { id: string; name: string; className: string | null; realmName: string }[];
  totals: {
    pulls: number;
    kills: number;
    wipes: number;
    raidNights: number;
    deaths: number;
    damageDone: bigint;
    healingDone: bigint;
    combatMs: number;
  };
  parses: {
    sampleSize: number;
    bossCount: number;
    bestPerBossMean: number | null;
    best: number | null;
    count99: number;
    count95: number;
  };
  encounters: EncounterLine[];
  deathCauses: DeathCauseLine[];
}

/** Resolves a profile by character name; returns every match for disambiguation. */
export async function findCharactersByName(name: string) {
  return prisma.character.findMany({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true, name: true, realmName: true, region: true, className: true },
    orderBy: { name: 'asc' },
  });
}

export async function loadPlayerProfile(characterId: string): Promise<PlayerProfile | null> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
      id: true,
      name: true,
      realmName: true,
      region: true,
      className: true,
      mainSpec: true,
      firstSeenAt: true,
      lastSeenAt: true,
      person: {
        select: {
          id: true,
          displayName: true,
          slug: true,
          characters: {
            select: { id: true, name: true, className: true, realmName: true },
            orderBy: { name: 'asc' },
          },
        },
      },
    },
  });

  if (!character) return null;

  const [totalsRow, perfRow, parseRow, encounters, deathCauses] = await Promise.all([
    prisma.$queryRaw<
      { pulls: bigint; kills: bigint; raid_nights: bigint; combat_ms: bigint | null }[]
    >`
      SELECT COUNT(*)                       AS pulls,
             COUNT(*) FILTER (WHERE f.kill) AS kills,
             COUNT(DISTINCT f."reportId")   AS raid_nights,
             SUM(f."durationMs")::bigint    AS combat_ms
      FROM "FightParticipant" p
      JOIN "Fight" f ON f.id = p."fightId"
      WHERE p."characterId" = ${characterId}
    `,
    prisma.fightPerformance.aggregate({
      where: { characterId },
      _sum: { damageDone: true, healingDone: true },
    }),
    prisma.$queryRaw<
      {
        sample_size: bigint;
        boss_count: bigint;
        best_per_boss_mean: number | null;
        best: number | null;
        c99: bigint;
        c95: bigint;
      }[]
    >`
      WITH kills AS (
        SELECT f."encounterId" AS encounter_id,
               f."difficultyId" AS difficulty_id,
               pr."rankPercent" AS rank_percent
        FROM "ParseRanking" pr
        JOIN "Fight" f ON f.id = pr."fightId"
        WHERE pr."characterId" = ${characterId}
      ),
      per_boss AS (
        SELECT encounter_id, difficulty_id, MAX(rank_percent) AS best_parse
        FROM kills GROUP BY encounter_id, difficulty_id
      )
      SELECT (SELECT COUNT(*) FROM kills)                  AS sample_size,
             (SELECT COUNT(*) FROM per_boss)               AS boss_count,
             (SELECT AVG(best_parse) FROM per_boss)        AS best_per_boss_mean,
             (SELECT MAX(rank_percent) FROM kills)         AS best,
             (SELECT COUNT(*) FROM kills WHERE rank_percent >= 99) AS c99,
             (SELECT COUNT(*) FROM kills WHERE rank_percent >= 95) AS c95
    `,
    prisma.$queryRaw<
      {
        boss: string;
        difficulty: string | null;
        kills: bigint;
        pulls: bigint;
        best_parse: number | null;
        avg_parse: number | null;
      }[]
    >`
      SELECT e.name AS boss,
             d.name AS difficulty,
             COUNT(*) FILTER (WHERE f.kill) AS kills,
             COUNT(*)                       AS pulls,
             MAX(pr."rankPercent")          AS best_parse,
             AVG(pr."rankPercent")          AS avg_parse
      FROM "FightParticipant" p
      JOIN "Fight" f           ON f.id = p."fightId"
      JOIN "Encounter" e       ON e.id = f."encounterId"
      LEFT JOIN "Difficulty" d ON d.id = f."difficultyId"
      LEFT JOIN "ParseRanking" pr
             ON pr."fightId" = f.id AND pr."characterId" = p."characterId"
      WHERE p."characterId" = ${characterId}
      GROUP BY e.name, d.name
      ORDER BY pulls DESC
      LIMIT 60
    `,
    prisma.$queryRaw<{ abilityName: string | null; deaths: bigint }[]>`
      SELECT "abilityName", COUNT(*) AS deaths
      FROM "DeathEvent"
      WHERE "characterId" = ${characterId}
      GROUP BY "abilityName"
      ORDER BY deaths DESC
      LIMIT 12
    `,
  ]);

  const totals = totalsRow[0];
  const parse = parseRow[0];
  const deaths = await prisma.deathEvent.count({ where: { characterId } });

  const pulls = Number(totals?.pulls ?? 0);
  const kills = Number(totals?.kills ?? 0);

  return {
    characterId: character.id,
    name: character.name,
    realmName: character.realmName,
    region: character.region,
    className: character.className,
    mainSpec: character.mainSpec,
    firstSeenAt: character.firstSeenAt,
    lastSeenAt: character.lastSeenAt,
    person: character.person
      ? {
          id: character.person.id,
          displayName: character.person.displayName,
          slug: character.person.slug,
        }
      : null,
    siblings:
      character.person?.characters.filter((sibling) => sibling.id !== character.id) ?? [],
    totals: {
      pulls,
      kills,
      wipes: pulls - kills,
      raidNights: Number(totals?.raid_nights ?? 0),
      deaths,
      damageDone: perfRow._sum.damageDone ?? 0n,
      healingDone: perfRow._sum.healingDone ?? 0n,
      combatMs: Number(totals?.combat_ms ?? 0),
    },
    parses: {
      sampleSize: Number(parse?.sample_size ?? 0),
      bossCount: Number(parse?.boss_count ?? 0),
      bestPerBossMean: parse?.best_per_boss_mean ?? null,
      best: parse?.best ?? null,
      count99: Number(parse?.c99 ?? 0),
      count95: Number(parse?.c95 ?? 0),
    },
    encounters: encounters.map((row) => ({
      boss: row.boss,
      difficulty: row.difficulty,
      kills: Number(row.kills),
      pulls: Number(row.pulls),
      bestParse: row.best_parse,
      averageParse: row.avg_parse,
    })),
    deathCauses: deathCauses.map((row) => ({
      abilityName: row.abilityName,
      deaths: Number(row.deaths),
    })),
  };
}
