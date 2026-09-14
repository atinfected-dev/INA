import { prisma } from '@ina/db';

/**
 * Guild records and Hall of Fame holders.
 *
 * Each entry is a separate, small query rather than one giant statement: they
 * are unrelated questions, they run in parallel, and a record that cannot be
 * answered yet returns null instead of quietly falling back to something else.
 *
 * Metrics that have no imported data yet (damage taken, interrupts, dispels,
 * attendance) are represented explicitly as `unavailable`, so the page can say
 * what is missing rather than render an empty card.
 */

export interface RecordEntry {
  key: string;
  label: string;
  /** What the number means, shown to the reader. */
  formula: string;
  value: string;
  /** Who or what holds it. */
  holder: string | null;
  holderClass?: string | null;
  /** Boss, raid night, or whatever qualifies the record. */
  context?: string | null;
  /** Set when the underlying data has not been imported. */
  unavailable?: string;
}

const de = (n: number): string => n.toLocaleString('de-DE');
const de1 = (n: number): string =>
  n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function amount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mrd.`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio.`;
  if (abs >= 1_000) return `${(value / 1_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Tsd.`;
  return de(Math.round(value));
}

function duration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

interface HolderRow {
  name: string;
  className: string | null;
  context: string | null;
  value: number;
}

export async function loadRecords(): Promise<RecordEntry[]> {
  const [
    bestParse,
    most100,
    most99,
    highestDps,
    highestHps,
    biggestDamage,
    mostDeaths,
    mostWipes,
    mostKills,
    mostNights,
    longestRaid,
    fastestKill,
    mostPulledBoss,
  ] = await Promise.all([
    prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", e.name || COALESCE(' (' || d.name || ')', '') AS context,
             pr."rankPercent" AS value
      FROM "ParseRanking" pr
      JOIN "Character" c       ON c.id = pr."characterId"
      JOIN "Fight" f           ON f.id = pr."fightId"
      LEFT JOIN "Encounter" e  ON e.id = f."encounterId"
      LEFT JOIN "Difficulty" d ON d.id = f."difficultyId"
      ORDER BY pr."rankPercent" DESC, f."startTime" ASC
      LIMIT 1
    `,
    prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", NULL AS context, COUNT(*)::float AS value
      FROM "ParseRanking" pr JOIN "Character" c ON c.id = pr."characterId"
      WHERE pr."rankPercent" >= 100
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
    `,
    prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", NULL AS context, COUNT(*)::float AS value
      FROM "ParseRanking" pr JOIN "Character" c ON c.id = pr."characterId"
      WHERE pr."rankPercent" >= 99
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
    `,
    prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", e.name || COALESCE(' (' || d.name || ')', '') AS context,
             fp.dps AS value
      FROM "FightPerformance" fp
      JOIN "Character" c       ON c.id = fp."characterId"
      JOIN "Fight" f           ON f.id = fp."fightId"
      LEFT JOIN "Encounter" e  ON e.id = f."encounterId"
      LEFT JOIN "Difficulty" d ON d.id = f."difficultyId"
      ORDER BY fp.dps DESC LIMIT 1
    `,
    prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", e.name || COALESCE(' (' || d.name || ')', '') AS context,
             fp.hps AS value
      FROM "FightPerformance" fp
      JOIN "Character" c       ON c.id = fp."characterId"
      JOIN "Fight" f           ON f.id = fp."fightId"
      LEFT JOIN "Encounter" e  ON e.id = f."encounterId"
      LEFT JOIN "Difficulty" d ON d.id = f."difficultyId"
      ORDER BY fp.hps DESC LIMIT 1
    `,
    prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", NULL AS context, SUM(fp."damageDone")::float AS value
      FROM "FightPerformance" fp JOIN "Character" c ON c.id = fp."characterId"
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
    `,
    prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", NULL AS context, COUNT(*)::float AS value
      FROM "DeathEvent" de JOIN "Character" c ON c.id = de."characterId"
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
    `,
    prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", NULL AS context, COUNT(*)::float AS value
      FROM "FightParticipant" p
      JOIN "Character" c ON c.id = p."characterId"
      JOIN "Fight" f     ON f.id = p."fightId"
      WHERE f.kill = false
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
    `,
    prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", NULL AS context, COUNT(*)::float AS value
      FROM "FightParticipant" p
      JOIN "Character" c ON c.id = p."characterId"
      JOIN "Fight" f     ON f.id = p."fightId"
      WHERE f.kill = true
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
    `,
    prisma.$queryRaw<HolderRow[]>`
      SELECT c.name, c."className", NULL AS context,
             COUNT(DISTINCT f."reportId")::float AS value
      FROM "FightParticipant" p
      JOIN "Character" c ON c.id = p."characterId"
      JOIN "Fight" f     ON f.id = p."fightId"
      GROUP BY c.id, c.name, c."className" ORDER BY value DESC LIMIT 1
    `,
    // Summed fight time, NOT the report's wall-clock span.
    //
    // Spans are unusable as a record: the longest one in this guild's history
    // covers 121 hours but contains 36 minutes of combat — somebody left the
    // logger running for five days. Combat time cannot be inflated that way.
    prisma.$queryRaw<HolderRow[]>`
      SELECT r.title AS name, NULL AS "className",
             to_char(r."startTime", 'DD.MM.YYYY') || ' · ' || COUNT(f.id) || ' Pulls' AS context,
             SUM(f."durationMs")::float AS value
      FROM "Report" r
      JOIN "Fight" f ON f."reportId" = r.id
      GROUP BY r.id, r.title, r."startTime"
      ORDER BY value DESC LIMIT 1
    `,
    // The raid is named alongside: the fastest kill in a decade of logs will
    // always be an old boss the guild massively outgeared, and the reader
    // should be able to see that rather than be impressed by it.
    prisma.$queryRaw<HolderRow[]>`
      SELECT e.name AS name, NULL AS "className",
             COALESCE(d.name || ' · ', '') || z.name AS context,
             f."durationMs"::float AS value
      FROM "Fight" f
      JOIN "Encounter" e       ON e.id = f."encounterId"
      JOIN "Zone" z            ON z.id = e."zoneId"
      LEFT JOIN "Difficulty" d ON d.id = f."difficultyId"
      WHERE f.kill = true AND f."durationMs" > 0
      ORDER BY f."durationMs" ASC LIMIT 1
    `,
    prisma.$queryRaw<HolderRow[]>`
      SELECT e.name AS name, NULL AS "className", d.name AS context, COUNT(*)::float AS value
      FROM "Fight" f
      JOIN "Encounter" e       ON e.id = f."encounterId"
      LEFT JOIN "Difficulty" d ON d.id = f."difficultyId"
      GROUP BY e.name, d.name ORDER BY value DESC LIMIT 1
    `,
  ]);

  const entry = (
    key: string,
    label: string,
    formula: string,
    rows: HolderRow[],
    format: (value: number) => string,
  ): RecordEntry => {
    const row = rows[0];
    return {
      key,
      label,
      formula,
      value: row ? format(row.value) : '—',
      holder: row?.name ?? null,
      holderClass: row?.className ?? null,
      context: row?.context ?? null,
    };
  };

  return [
    entry('bestParse', 'Höchster Parse', 'Das höchste je erreichte Parse-Perzentil.', bestParse, (v) => de1(v)),
    entry('most100', 'Meiste 100er Parses', 'Anzahl gewerteter Kills mit Perzentil 100.', most100, de),
    entry('most99', 'Meiste Parses ab 99', 'Anzahl gewerteter Kills mit Perzentil 99 oder höher.', most99, de),
    entry('highestDps', 'Höchster DPS', 'Der höchste DPS-Wert in einem einzelnen Kampf.', highestDps, amount),
    entry('highestHps', 'Höchste HPS', 'Der höchste HPS-Wert in einem einzelnen Kampf.', highestHps, amount),
    entry('mostDamage', 'Meister Schaden', 'Summe des Schadens über die gesamte Historie.', biggestDamage, amount),
    entry('mostKills', 'Meiste Bosskills', 'Anzahl der Pulls mit Kill, an denen teilgenommen wurde.', mostKills, de),
    entry('mostNights', 'Meiste Raidabende', 'Anzahl verschiedener Reports mit mindestens einem Boss-Pull.', mostNights, de),
    entry('mostWipes', 'Meiste Wipes', 'Anzahl der Pulls ohne Kill, an denen teilgenommen wurde.', mostWipes, de),
    entry('mostDeaths', 'Meiste Tode', 'Anzahl der Todesereignisse. Nur aus Raidabenden, deren Inhalte Warcraft Logs noch vorhält.', mostDeaths, de),
    entry('longestRaid', 'Meiste Kampfzeit an einem Abend', 'Summierte Dauer aller Pulls eines Reports. Bewusst nicht die Zeitspanne des Logs: der längste Log dieser Gilde umfasst 121 Stunden bei 36 Minuten Kampf, weil jemand den Logger tagelang laufen ließ.', longestRaid, duration),
    entry('fastestKill', 'Schnellster Bosskill', 'Kürzester Kampf, der mit einem Kill endete — über alle Erweiterungen, also fast zwangsläufig ein längst überlevelter Boss. Der Raid steht dabei.', fastestKill, duration),
    entry('mostPulledBoss', 'Meiste Pulls auf einen Boss', 'Boss mit den meisten Pulls über die gesamte Historie.', mostPulledBoss, de),
    {
      key: 'mostDamageTaken',
      label: 'Meister erlittener Schaden',
      formula: 'Summe des erlittenen Schadens.',
      value: '—',
      holder: null,
      unavailable:
        'Erlittener Schaden ist noch nicht importiert. Dafür braucht es einen weiteren table()-Durchlauf je Kampf.',
    },
    {
      key: 'bestAttendance',
      label: 'Höchste Attendance',
      formula: 'Anteil der Raidabende, an denen teilgenommen wurde.',
      value: '—',
      holder: null,
      unavailable:
        'Attendance braucht Raidabende als eigene Einheit — mehrere Reports eines Abends zusammengefasst. Noch nicht gebaut.',
    },
  ];
}
