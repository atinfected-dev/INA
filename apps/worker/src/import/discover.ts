import { prisma, SyncType, type Guild } from '@ina/db';
import { WclClient, GuildReportsDocument } from '@ina/wcl';

/**
 * Finds the guild's reports and records them as DISCOVERED.
 *
 * Discovery is deliberately separate from importing a report's contents: it is
 * one cheap paginated call that establishes the full work list, so a crash
 * halfway through the heavy per-report work loses nothing and the next run
 * simply continues.
 *
 * Incremental runs re-scan a window before the newest known report rather than
 * starting exactly where they left off. Raid leaders upload logs late, and
 * Warcraft Logs timestamps a report by when the raid happened, not when it was
 * uploaded — without the overlap those late logs would never be seen again.
 */

export interface DiscoverResult {
  type: SyncType;
  /** Milliseconds since epoch that the scan started from. */
  fromTime: number;
  pages: number;
  seen: number;
  created: number;
  /** Reports whose revision changed since the last import and need re-reading. */
  revised: number;
}

export interface DiscoverOptions {
  /** Ignore the last import and scan the guild's entire history. */
  full?: boolean;
  /** Hours re-scanned before the newest known report on an incremental run. */
  overlapHours?: number;
  /** Safety valve while developing; omit to fetch everything. */
  maxPages?: number;
}

const PAGE_SIZE = 100;

export async function discoverReports(
  guild: Pick<Guild, 'id' | 'name' | 'serverSlug' | 'serverRegion'>,
  client: WclClient = new WclClient(),
  options: DiscoverOptions = {},
): Promise<DiscoverResult> {
  const full = options.full ?? false;
  const overlapMs = (options.overlapHours ?? 72) * 3600_000;

  let fromTime = 0;
  if (!full) {
    const newest = await prisma.report.findFirst({
      where: { guildId: guild.id },
      orderBy: { startTime: 'desc' },
      select: { startTime: true },
    });
    if (newest) fromTime = Math.max(0, newest.startTime.getTime() - overlapMs);
  }

  const result: DiscoverResult = {
    type: full ? SyncType.FULL : SyncType.INCREMENTAL,
    fromTime,
    pages: 0,
    seen: 0,
    created: 0,
    revised: 0,
  };

  let page = 1;
  for (;;) {
    const response = await client.query(GuildReportsDocument, {
      guildName: guild.name,
      guildServerSlug: guild.serverSlug,
      guildServerRegion: guild.serverRegion,
      startTime: fromTime,
      limit: PAGE_SIZE,
      page,
    });

    const pageData = response.reportData?.reports;
    const reports = pageData?.data ?? [];
    result.pages += 1;

    for (const report of reports) {
      if (!report?.code) continue;
      result.seen += 1;

      const zone = report.zone
        ? await prisma.zone.findUnique({
            where: { wclZoneId: report.zone.id },
            select: { id: true },
          })
        : null;

      const existing = await prisma.report.findUnique({
        where: { code: report.code },
        select: { id: true, revision: true },
      });

      if (!existing) {
        result.created += 1;
      } else if (existing.revision !== report.revision) {
        // Warcraft Logs reprocessed the log. Reset the state so the content
        // import picks it up again instead of skipping it as unchanged.
        result.revised += 1;
      }

      await prisma.report.upsert({
        where: { code: report.code },
        update: {
          title: report.title,
          startTime: new Date(report.startTime),
          endTime: new Date(report.endTime),
          revision: report.revision,
          visibility: report.visibility,
          ownerName: report.owner?.name ?? null,
          zoneId: zone?.id ?? null,
        },
        create: {
          code: report.code,
          guildId: guild.id,
          title: report.title,
          startTime: new Date(report.startTime),
          endTime: new Date(report.endTime),
          revision: report.revision,
          visibility: report.visibility,
          ownerName: report.owner?.name ?? null,
          zoneId: zone?.id ?? null,
        },
      });
    }

    if (!pageData?.has_more_pages) break;
    if (options.maxPages !== undefined && result.pages >= options.maxPages) break;
    page += 1;
  }

  return result;
}
