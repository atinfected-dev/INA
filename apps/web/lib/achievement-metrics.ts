import { prisma } from '@ina/db';
import { SCRIPTED_DAMAGE_THRESHOLD, type SubjectMetrics } from '@ina/core';

/**
 * Every number an achievement can be measured against, per SUBJECT.
 *
 * A subject is a person where characters have been merged into one, and the
 * character itself where they have not. That is the whole point of the
 * feature: someone who raided a warrior in Wrath and a monk in Pandaria is one
 * raider with one history, not two strangers who each fell short of every
 * threshold.
 *
 * Deliberately a handful of grouped queries rather than one per achievement.
 * Seventy badges over forty metrics would otherwise be seventy scans of the
 * same tables, and every new idea another round trip.
 *
 * Where the underlying data is incomplete, the metric says so by omission
 * rather than by guessing:
 *
 *  * deaths only exist for reports whose contents Warcraft Logs still serves,
 *    so everything death-related is restricted to those — otherwise an
 *    archived year would silently read as flawless survival;
 *  * damage taken is only imported for part of the history, and scripted
 *    instant kills are excluded the same way the leaderboard excludes them.
 */

export interface SubjectIdentity {
  subjectId: string;
  kind: 'person' | 'character';
  name: string;
  className: string | null;
  /** Characters belonging to this subject. */
  characterIds: string[];
}

export interface SubjectRow extends SubjectIdentity {
  metrics: SubjectMetrics;
}

/** COALESCE(personId, characterId) is the subject key, everywhere. */
const SUBJECTS_CTE = `
  subjects AS (
    SELECT c.id                              AS character_id,
           COALESCE(c."personId", c.id)      AS subject_id,
           c."personId" IS NOT NULL          AS is_person,
           COALESCE(p."displayName", c.name) AS subject_name,
           c."className"                     AS class_name,
           c."realmSlug"                     AS realm_slug
    FROM "Character" c
    LEFT JOIN "Person" p ON p.id = c."personId"
  )
`;

function emptyMetrics(): SubjectMetrics {
  return {
    combatMs: 0,
    raidTimeMs: 0,
    pulls: 0,
    bossKills: 0,
    nights: 0,
    wipes: 0,
    expansions: 0,
    zones: 0,
    bossesKilled: 0,
    progressPulls: 0,
    firstKills: 0,
    heroicKills: 0,
    maxPullsOneBoss: 0,
    parses75: 0,
    parses90: 0,
    parses95: 0,
    parses99: 0,
    parses100: 0,
    bosses90: 0,
    damageDone: 0,
    healingDone: 0,
    damageTaken: 0,
    interrupts: 0,
    dispels: 0,
    deaths: 0,
    fightsDied: 0,
    firstDeaths: 0,
    killsWithoutDeath: 0,
    nightsWithoutDeath: 0,
    attendanceStreak: 0,
    classes: 0,
    maxKillsOneClass: 0,
    maxCombatMsOneClass: 0,
    charactersWithKills: 0,
    realms: 0,
    mergedCharacters: 0,
    longestNightMs: 0,
    maxPullsOneNight: 0,
    lateNightCombatMs: 0,
    firstNightIndex: 0,
  };
}

const n = (value: unknown): number => (value === null || value === undefined ? 0 : Number(value));

export async function loadSubjectMetrics(): Promise<SubjectRow[]> {
  const [identities, participation, classes, nights, parses, performance, deaths, utility] =
    await Promise.all([
      prisma.$queryRawUnsafe<
        {
          subject_id: string;
          is_person: boolean;
          subject_name: string;
          class_name: string | null;
          character_ids: string[];
          realms: bigint;
          merged: bigint;
        }[]
      >(`
        WITH ${SUBJECTS_CTE}
        SELECT s.subject_id,
               BOOL_OR(s.is_person)                        AS is_person,
               MIN(s.subject_name)                         AS subject_name,
               MODE() WITHIN GROUP (ORDER BY s.class_name) AS class_name,
               ARRAY_AGG(s.character_id)                   AS character_ids,
               COUNT(DISTINCT s.realm_slug)                AS realms,
               COUNT(*)                                    AS merged
        FROM subjects s
        GROUP BY s.subject_id
      `),

      // Pulls, kills, wipes and everything derived from taking part in a fight.
      prisma.$queryRawUnsafe<
        {
          subject_id: string;
          combat_ms: bigint;
          pulls: bigint;
          boss_kills: bigint;
          wipes: bigint;
          expansions: bigint;
          zones: bigint;
          bosses_killed: bigint;
          heroic_kills: bigint;
          late_night_ms: bigint;
          characters_with_kills: bigint;
        }[]
      >(`
        WITH ${SUBJECTS_CTE},
        pulls AS (
          SELECT s.subject_id,
                 s.character_id,
                 f.id            AS fight_id,
                 f."durationMs"  AS duration_ms,
                 f.kill          AS kill,
                 f."encounterId" AS encounter_id,
                 e."zoneId"      AS zone_id,
                 z."expansionId" AS expansion_id,
                 d.name          AS difficulty,
                 EXTRACT(HOUR FROM f."startTime" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')
                   AS local_hour
          FROM "FightParticipant" fp
          JOIN subjects s          ON s.character_id = fp."characterId"
          JOIN "Fight" f           ON f.id = fp."fightId"
          LEFT JOIN "Encounter" e  ON e.id = f."encounterId"
          LEFT JOIN "Zone" z       ON z.id = e."zoneId"
          LEFT JOIN "Difficulty" d ON d.id = f."difficultyId"
        )
        SELECT subject_id,
               SUM(duration_ms)::bigint AS combat_ms,
               COUNT(*)                 AS pulls,
               COUNT(*) FILTER (WHERE kill AND encounter_id IS NOT NULL) AS boss_kills,
               COUNT(*) FILTER (WHERE NOT kill)                          AS wipes,
               COUNT(DISTINCT expansion_id)                              AS expansions,
               COUNT(DISTINCT zone_id)                                   AS zones,
               COUNT(DISTINCT encounter_id) FILTER (WHERE kill)          AS bosses_killed,
               COUNT(*) FILTER (WHERE kill AND difficulty IN ('Heroic', 'Mythic')) AS heroic_kills,
               COALESCE(SUM(duration_ms) FILTER (WHERE local_hour >= 0 AND local_hour < 6), 0)::bigint
                 AS late_night_ms,
               COUNT(DISTINCT character_id) FILTER (WHERE kill AND encounter_id IS NOT NULL)
                 AS characters_with_kills
        FROM pulls
        GROUP BY subject_id
      `),

      // Per class, so "most kills on one class" and "hours on one class" do
      // not need a second pass over the same rows.
      prisma.$queryRawUnsafe<
        {
          subject_id: string;
          classes: bigint;
          max_kills_one_class: bigint;
          max_ms_one_class: bigint;
          max_pulls_one_boss: bigint;
        }[]
      >(`
        WITH ${SUBJECTS_CTE},
        per_class AS (
          SELECT s.subject_id, s.class_name,
                 COUNT(*) FILTER (WHERE f.kill AND f."encounterId" IS NOT NULL) AS kills,
                 SUM(f."durationMs")::bigint AS ms
          FROM "FightParticipant" fp
          JOIN subjects s ON s.character_id = fp."characterId"
          JOIN "Fight" f  ON f.id = fp."fightId"
          WHERE s.class_name IS NOT NULL AND s.class_name <> 'Unknown'
          GROUP BY s.subject_id, s.class_name
        ),
        per_boss AS (
          SELECT s.subject_id, f."encounterId", f."difficultyId", COUNT(*) AS pulls
          FROM "FightParticipant" fp
          JOIN subjects s ON s.character_id = fp."characterId"
          JOIN "Fight" f  ON f.id = fp."fightId"
          WHERE f."encounterId" IS NOT NULL
          GROUP BY s.subject_id, f."encounterId", f."difficultyId"
        )
        SELECT c.subject_id,
               COUNT(*)           AS classes,
               MAX(c.kills)       AS max_kills_one_class,
               MAX(c.ms)          AS max_ms_one_class,
               COALESCE((SELECT MAX(b.pulls) FROM per_boss b WHERE b.subject_id = c.subject_id), 0)
                 AS max_pulls_one_boss
        FROM per_class c
        GROUP BY c.subject_id
      `),

      // Raid nights: attendance, streaks, the longest night, and the one night
      // metric that reads backwards — how early the subject first appeared.
      prisma.$queryRawUnsafe<
        {
          subject_id: string;
          nights: bigint;
          raid_time_ms: bigint;
          longest_night_ms: bigint;
          max_pulls_one_night: bigint;
          nights_without_death: bigint;
          streak: bigint;
          first_night_index: bigint;
        }[]
      >(`
        WITH ${SUBJECTS_CTE},
        ordered_nights AS (
          SELECT id, "startTime", "endTime",
                 ROW_NUMBER() OVER (ORDER BY "startTime") AS night_index
          FROM "RaidSession"
        ),
        attended AS (
          SELECT s.subject_id,
                 sa."sessionId",
                 o.night_index,
                 SUM(sa."activeMs")::bigint AS active_ms,
                 -- The night's own length, first pull to last. Counted once
                 -- per night even when several of a person's characters were
                 -- present, which is why it is a MAX and not a SUM here.
                 MAX(EXTRACT(EPOCH FROM (o."endTime" - o."startTime")) * 1000)::bigint AS span_ms
          FROM "SessionAttendance" sa
          JOIN subjects s        ON s.character_id = sa."characterId"
          JOIN ordered_nights o  ON o.id = sa."sessionId"
          WHERE sa."isPresent"
          GROUP BY s.subject_id, sa."sessionId", o.night_index
        ),
        -- A raid night owns no fight rows of its own: sessions are cut out of
        -- the fight stream by time, so the time range is the link back.
        session_fights AS (
          SELECT rs.id AS session_id, f.id AS fight_id
          FROM "RaidSession" rs
          JOIN "Fight" f ON f."startTime" >= rs."startTime" AND f."startTime" <= rs."endTime"
        ),
        pulls_per_night AS (
          SELECT a.subject_id, a."sessionId", COUNT(*) AS pulls
          FROM attended a
          JOIN session_fights sf   ON sf.session_id = a."sessionId"
          JOIN "FightParticipant" fp2 ON fp2."fightId" = sf.fight_id
          JOIN subjects s3         ON s3.character_id = fp2."characterId"
          WHERE s3.subject_id = a.subject_id
          GROUP BY a.subject_id, a."sessionId"
        ),
        -- Consecutive nights: the classic gaps-and-islands trick. Subtracting
        -- a dense rank from the night index makes every unbroken run share one
        -- constant, so the longest run is the largest group.
        runs AS (
          SELECT subject_id,
                 night_index - ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY night_index)
                   AS run_key
          FROM attended
        ),
        streaks AS (
          SELECT subject_id, COUNT(*) AS streak
          FROM runs GROUP BY subject_id, run_key
        ),
        -- Only nights whose logs are all still served can be called
        -- death-free; an archived night simply has no death data.
        clean_nights AS (
          SELECT a.subject_id, COUNT(*) AS nights_without_death
          FROM attended a
          WHERE NOT EXISTS (
                  SELECT 1 FROM "SessionReport" sr
                  JOIN "Report" r ON r.id = sr."reportId"
                  WHERE sr."sessionId" = a."sessionId" AND r."contentsArchived"
                )
            AND NOT EXISTS (
                  SELECT 1
                  FROM "DeathEvent" de
                  JOIN subjects s2 ON s2.character_id = de."characterId"
                  JOIN session_fights sf2 ON sf2.fight_id = de."fightId"
                  WHERE s2.subject_id = a.subject_id AND sf2.session_id = a."sessionId"
                )
          GROUP BY a.subject_id
        )
        SELECT a.subject_id,
               COUNT(*)                AS nights,
               SUM(a.span_ms)::bigint  AS raid_time_ms,
               MAX(a.span_ms)          AS longest_night_ms,
               COALESCE((SELECT MAX(p.pulls) FROM pulls_per_night p WHERE p.subject_id = a.subject_id), 0)
                 AS max_pulls_one_night,
               COALESCE((SELECT c.nights_without_death FROM clean_nights c WHERE c.subject_id = a.subject_id), 0)
                 AS nights_without_death,
               COALESCE((SELECT MAX(st.streak) FROM streaks st WHERE st.subject_id = a.subject_id), 0)
                 AS streak,
               MIN(a.night_index)      AS first_night_index
        FROM attended a
        GROUP BY a.subject_id
      `),

      prisma.$queryRawUnsafe<
        {
          subject_id: string;
          p75: bigint;
          p90: bigint;
          p95: bigint;
          p99: bigint;
          p100: bigint;
          bosses90: bigint;
        }[]
      >(`
        WITH ${SUBJECTS_CTE}
        SELECT s.subject_id,
               COUNT(*) FILTER (WHERE pr."rankPercent" >= 75)  AS p75,
               COUNT(*) FILTER (WHERE pr."rankPercent" >= 90)  AS p90,
               COUNT(*) FILTER (WHERE pr."rankPercent" >= 95)  AS p95,
               COUNT(*) FILTER (WHERE pr."rankPercent" >= 99)  AS p99,
               COUNT(*) FILTER (WHERE pr."rankPercent" >= 100) AS p100,
               COUNT(DISTINCT f."encounterId") FILTER (WHERE pr."rankPercent" >= 90) AS bosses90
        FROM "ParseRanking" pr
        JOIN subjects s ON s.character_id = pr."characterId"
        JOIN "Fight" f  ON f.id = pr."fightId"
        GROUP BY s.subject_id
      `),

      prisma.$queryRawUnsafe<
        {
          subject_id: string;
          damage_done: bigint;
          healing_done: bigint;
          damage_taken: bigint;
          kills_without_death: bigint;
        }[]
      >(`
        WITH ${SUBJECTS_CTE}
        SELECT s.subject_id,
               COALESCE(SUM(fp."damageDone"), 0)::bigint  AS damage_done,
               COALESCE(SUM(fp."healingDone"), 0)::bigint AS healing_done,
               COALESCE(SUM(fp."damageTaken") FILTER (
                 WHERE f."damageTakenImported" AND fp."damageTaken" < ${SCRIPTED_DAMAGE_THRESHOLD}
               ), 0)::bigint AS damage_taken,
               COUNT(*) FILTER (
                 WHERE f.kill AND f."encounterId" IS NOT NULL AND NOT r."contentsArchived"
                   AND NOT EXISTS (
                     SELECT 1 FROM "DeathEvent" de
                     WHERE de."fightId" = fp."fightId" AND de."characterId" = fp."characterId"
                   )
               ) AS kills_without_death
        FROM "FightPerformance" fp
        JOIN subjects s  ON s.character_id = fp."characterId"
        JOIN "Fight" f   ON f.id = fp."fightId"
        JOIN "Report" r  ON r.id = f."reportId"
        GROUP BY s.subject_id
      `),

      prisma.$queryRawUnsafe<
        { subject_id: string; deaths: bigint; fights_died: bigint; first_deaths: bigint }[]
      >(`
        WITH ${SUBJECTS_CTE},
        -- The first death of a pull. DISTINCT ON keeps exactly one row per
        -- fight, so a simultaneous wipe cannot hand the title to five people.
        first_per_fight AS (
          SELECT DISTINCT ON (de."fightId") de."fightId", de."characterId"
          FROM "DeathEvent" de
          ORDER BY de."fightId", de."timestampMs" ASC, de.id ASC
        )
        SELECT s.subject_id,
               COUNT(*)                        AS deaths,
               COUNT(DISTINCT de."fightId")    AS fights_died,
               COUNT(*) FILTER (
                 WHERE EXISTS (
                   SELECT 1 FROM first_per_fight f
                   WHERE f."fightId" = de."fightId" AND f."characterId" = de."characterId"
                 )
               ) AS first_deaths
        FROM "DeathEvent" de
        JOIN subjects s ON s.character_id = de."characterId"
        GROUP BY s.subject_id
      `),

      prisma.$queryRawUnsafe<{ subject_id: string; interrupts: bigint; dispels: bigint }[]>(`
        WITH ${SUBJECTS_CTE}
        SELECT s.subject_id,
               COALESCE(SUM(ru.interrupts), 0)::bigint AS interrupts,
               COALESCE(SUM(ru.dispels), 0)::bigint    AS dispels
        FROM "ReportUtility" ru
        JOIN subjects s ON s.character_id = ru."characterId"
        GROUP BY s.subject_id
      `),
    ]);

  const rows = new Map<string, SubjectRow>();
  for (const row of identities) {
    rows.set(row.subject_id, {
      subjectId: row.subject_id,
      kind: row.is_person ? 'person' : 'character',
      name: row.subject_name,
      className: row.class_name,
      characterIds: row.character_ids,
      metrics: {
        ...emptyMetrics(),
        realms: n(row.realms),
        mergedCharacters: n(row.merged),
      },
    });
  }

  const at = (id: string): SubjectMetrics | null => rows.get(id)?.metrics ?? null;

  for (const row of participation) {
    const m = at(row.subject_id);
    if (!m) continue;
    m.combatMs = n(row.combat_ms);
    m.pulls = n(row.pulls);
    m.bossKills = n(row.boss_kills);
    m.wipes = n(row.wipes);
    m.expansions = n(row.expansions);
    m.zones = n(row.zones);
    m.bossesKilled = n(row.bosses_killed);
    m.heroicKills = n(row.heroic_kills);
    m.lateNightCombatMs = n(row.late_night_ms);
    m.charactersWithKills = n(row.characters_with_kills);
  }

  for (const row of classes) {
    const m = at(row.subject_id);
    if (!m) continue;
    m.classes = n(row.classes);
    m.maxKillsOneClass = n(row.max_kills_one_class);
    m.maxCombatMsOneClass = n(row.max_ms_one_class);
    m.maxPullsOneBoss = n(row.max_pulls_one_boss);
  }

  for (const row of nights) {
    const m = at(row.subject_id);
    if (!m) continue;
    m.nights = n(row.nights);
    m.raidTimeMs = n(row.raid_time_ms);
    m.longestNightMs = n(row.longest_night_ms);
    m.maxPullsOneNight = n(row.max_pulls_one_night);
    m.nightsWithoutDeath = n(row.nights_without_death);
    m.attendanceStreak = n(row.streak);
    m.firstNightIndex = n(row.first_night_index);
  }

  for (const row of parses) {
    const m = at(row.subject_id);
    if (!m) continue;
    m.parses75 = n(row.p75);
    m.parses90 = n(row.p90);
    m.parses95 = n(row.p95);
    m.parses99 = n(row.p99);
    m.parses100 = n(row.p100);
    m.bosses90 = n(row.bosses90);
  }

  for (const row of performance) {
    const m = at(row.subject_id);
    if (!m) continue;
    m.damageDone = n(row.damage_done);
    m.healingDone = n(row.healing_done);
    m.damageTaken = n(row.damage_taken);
    m.killsWithoutDeath = n(row.kills_without_death);
  }

  for (const row of deaths) {
    const m = at(row.subject_id);
    if (!m) continue;
    m.deaths = n(row.deaths);
    m.fightsDied = n(row.fights_died);
    m.firstDeaths = n(row.first_deaths);
  }

  for (const row of utility) {
    const m = at(row.subject_id);
    if (!m) continue;
    m.interrupts = n(row.interrupts);
    m.dispels = n(row.dispels);
  }

  // Progress pulls and first kills need the guild's own history as a
  // reference point, so they are resolved separately.
  await addProgressMetrics(rows);

  return [...rows.values()];
}

/**
 * Pulls spent on a boss before the guild first killed it, and participations
 * in that first kill.
 *
 * "First" is the guild's first, not Warcraft Logs' — this is a guild history,
 * and the night the guild finally got a boss down is the one that matters.
 * Difficulty counts separately: the first Heroic kill is its own occasion.
 */
async function addProgressMetrics(rows: Map<string, SubjectRow>): Promise<void> {
  const progress = await prisma.$queryRawUnsafe<
    { subject_id: string; progress_pulls: bigint; first_kills: bigint }[]
  >(`
    WITH ${SUBJECTS_CTE},
    first_kill AS (
      SELECT f."encounterId", f."difficultyId", MIN(f."startTime") AS first_kill_at
      FROM "Fight" f
      WHERE f.kill AND f."encounterId" IS NOT NULL
      GROUP BY f."encounterId", f."difficultyId"
    )
    SELECT s.subject_id,
           COUNT(*) FILTER (WHERE f."startTime" < k.first_kill_at) AS progress_pulls,
           COUNT(*) FILTER (WHERE f.kill AND f."startTime" = k.first_kill_at) AS first_kills
    FROM "FightParticipant" fp
    JOIN subjects s   ON s.character_id = fp."characterId"
    JOIN "Fight" f    ON f.id = fp."fightId"
    JOIN first_kill k ON k."encounterId" = f."encounterId"
                     AND k."difficultyId" IS NOT DISTINCT FROM f."difficultyId"
    GROUP BY s.subject_id
  `);

  for (const row of progress) {
    const metrics = rows.get(row.subject_id)?.metrics;
    if (!metrics) continue;
    metrics.progressPulls = Number(row.progress_pulls);
    metrics.firstKills = Number(row.first_kills);
  }
}
