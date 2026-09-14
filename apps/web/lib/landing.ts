import { prisma } from '@ina/db';
import { loadHallOfFame, topHolders, type HallOfFameHolder } from './hall-of-fame';
import { loadRecords, type RecordEntry } from './records';
import { loadSettings } from './settings';

/**
 * Everything the landing page shows.
 *
 * All of it is drawn from the same loaders the inner pages use — the Hall of
 * Fame here is the Hall of Fame there — so the front door can never advertise
 * a number the page behind it disagrees with.
 */

export interface LandingTotals {
  nights: number;
  pulls: number;
  kills: number;
  wipes: number;
  raiders: number;
  combatMs: number;
  firstNight: Date | null;
  lastNight: Date | null;
}

export interface ExpansionStop {
  name: string;
  slug: string;
  from: Date;
  to: Date;
  nights: number;
  kills: number;
  raids: number;
}

export interface LatestNight {
  date: Date;
  combatMs: number;
  raiders: number;
  pulls: number;
  kills: { boss: string; difficulty: string | null }[];
  zone: string | null;
}

export interface Landing {
  guildName: string;
  totals: LandingTotals;
  expansions: ExpansionStop[];
  /** Top titles, ties already resolved into a single named holder or a tie. */
  titles: HallOfFameHolder[];
  records: RecordEntry[];
  latest: LatestNight | null;
}

const FEATURED_RECORDS = ['bestParse', 'highestDps', 'mostWipes', 'fastestKill'] as const;

export async function loadLanding(): Promise<Landing> {
  const [guilds, sessionAgg, fights, kills, raiders, expansions, settings, records, latestSession] =
    await Promise.all([
      prisma.guild.findMany({ orderBy: { isDefault: 'desc' }, select: { name: true } }),
      prisma.raidSession.aggregate({
        _count: true,
        _sum: { durationMs: true },
        _min: { startTime: true },
        _max: { startTime: true },
      }),
      prisma.fight.count(),
      prisma.fight.count({ where: { kill: true, encounterId: { not: null } } }),
      // Raiders who were there for more than a night, the same bar the members
      // page and the achievement rarity use.
      prisma.$queryRaw<{ raiders: bigint }[]>`
        SELECT COUNT(*) AS raiders FROM (
          SELECT COALESCE(c."personId", c.id) AS subject
          FROM "SessionAttendance" sa
          JOIN "Character" c ON c.id = sa."characterId"
          WHERE sa."isPresent"
          GROUP BY 1
          HAVING COUNT(DISTINCT sa."sessionId") >= 20
        ) t
      `,
      prisma.$queryRaw<
        {
          name: string;
          slug: string;
          from: Date;
          to: Date;
          nights: bigint;
          kills: bigint;
          raids: bigint;
        }[]
      >`
        SELECT x.name,
               x.slug,
               MIN(f."startTime") AS "from",
               MAX(f."startTime") AS "to",
               COUNT(DISTINCT DATE(f."startTime")) AS nights,
               COUNT(*) FILTER (WHERE f.kill)      AS kills,
               COUNT(DISTINCT z.id)                AS raids
        FROM "Fight" f
        JOIN "Encounter" e ON e.id = f."encounterId"
        JOIN "Zone" z      ON z.id = e."zoneId"
        JOIN "Expansion" x ON x.id = z."expansionId"
        GROUP BY x.id, x.name, x.slug, x."sortOrder"
        ORDER BY x."sortOrder"
      `,
      loadSettings(),
      loadRecords(),
      prisma.raidSession.findFirst({
        orderBy: { startTime: 'desc' },
        select: {
          startTime: true,
          endTime: true,
          durationMs: true,
          _count: { select: { attendance: { where: { isPresent: true } } } },
        },
      }),
    ]);

  const titles = await loadHallOfFame(settings.hallOfFameTitles);

  let latest: LatestNight | null = null;
  if (latestSession) {
    // The night's fights, by time: a session owns no fight rows of its own.
    const nightFights = await prisma.fight.findMany({
      where: { startTime: { gte: latestSession.startTime, lte: latestSession.endTime } },
      orderBy: { startTime: 'asc' },
      select: {
        kill: true,
        encounter: { select: { name: true, zone: { select: { name: true } } } },
        difficulty: { select: { name: true } },
      },
    });

    latest = {
      date: latestSession.startTime,
      combatMs: latestSession.durationMs,
      raiders: latestSession._count.attendance,
      pulls: nightFights.length,
      kills: nightFights
        .filter((fight) => fight.kill && fight.encounter)
        .map((fight) => ({
          boss: fight.encounter!.name,
          difficulty: fight.difficulty?.name ?? null,
        })),
      zone: nightFights.find((fight) => fight.encounter)?.encounter?.zone.name ?? null,
    };
  }

  const featured = FEATURED_RECORDS.map((key) => records.find((entry) => entry.key === key)).filter(
    (entry): entry is RecordEntry => entry !== undefined && !entry.unavailable,
  );

  return {
    guildName: guilds[0]?.name ?? 'INA Analytics',
    totals: {
      nights: sessionAgg._count,
      pulls: fights,
      kills,
      wipes: fights - kills,
      raiders: Number(raiders[0]?.raiders ?? 0),
      combatMs: sessionAgg._sum.durationMs ?? 0,
      firstNight: sessionAgg._min.startTime,
      lastNight: sessionAgg._max.startTime,
    },
    // The chapters of the story, not every excursion: a single nostalgia run
    // into Ahn'Qiraj is a fact for the raid list, not a stop on the journey.
    expansions: expansions.filter((row) => Number(row.nights) >= 10).map((row) => ({
      name: row.name,
      slug: row.slug,
      from: row.from,
      to: row.to,
      nights: Number(row.nights),
      kills: Number(row.kills),
      raids: Number(row.raids),
    })),
    // Only titles that resolve to a single holder read well on a front door;
    // a 29-way tie is a fact for the Hall of Fame page, not a headline.
    titles: titles.filter((holder) => holder.name && !holder.unavailable && holder.tiedWith.length <= 1),
    records: featured,
    latest,
  };
}

export { topHolders };
