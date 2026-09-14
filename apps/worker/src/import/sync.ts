import { prisma, ImportState, SyncStatus, SyncType, type Guild } from '@ina/db';
import { WclClient } from '@ina/wcl';
import { discoverReports } from './discover.js';
import { importReport } from './report.js';

/**
 * A full sync run: discover the guild's reports, then import the contents of
 * everything still outstanding.
 *
 * Every step is recorded in a SyncRun row so the admin UI can show what
 * happened, including how many API points it cost. A report that fails is
 * marked FAILED with its error and the run continues — one broken log must not
 * stop the other 300.
 */

export interface SyncOptions {
  full?: boolean;
  /** Skip discovery and only work through reports already marked DISCOVERED. */
  importOnly?: boolean;
  /** Cap the number of reports imported in this run. */
  limit?: number;
  onProgress?: (progress: SyncProgress) => void;
}

export interface SyncProgress {
  index: number;
  total: number;
  code: string;
  fights: number;
  skipped: boolean;
  failed: boolean;
}

export interface SyncResult {
  syncRunId: string;
  discovered: number;
  imported: number;
  skipped: number;
  failed: number;
  fights: number;
  pointsSpent: number;
}

export async function runSync(
  guild: Pick<Guild, 'id' | 'name' | 'serverSlug' | 'serverRegion'>,
  client: WclClient = new WclClient(),
  options: SyncOptions = {},
): Promise<SyncResult> {
  const before = await client.getRateLimit();

  const syncRun = await prisma.syncRun.create({
    data: {
      guildId: guild.id,
      type: options.full ? SyncType.FULL : SyncType.INCREMENTAL,
      status: SyncStatus.RUNNING,
    },
    select: { id: true },
  });

  const result: SyncResult = {
    syncRunId: syncRun.id,
    discovered: 0,
    imported: 0,
    skipped: 0,
    failed: 0,
    fights: 0,
    pointsSpent: 0,
  };

  try {
    if (!options.importOnly) {
      const discovery = await discoverReports(guild, client, { full: options.full });
      result.discovered = discovery.created;
    }

    const pending = await prisma.report.findMany({
      where: {
        guildId: guild.id,
        importState: { in: [ImportState.DISCOVERED, ImportState.FAILED] },
      },
      // Oldest first, so an interrupted run leaves a contiguous imported
      // history rather than holes in the middle.
      orderBy: { startTime: 'asc' },
      select: { code: true },
      ...(options.limit === undefined ? {} : { take: options.limit }),
    });

    for (const [index, report] of pending.entries()) {
      let fights = 0;
      let skipped = false;
      let failed = false;

      try {
        const imported = await importReport(report.code, client, {
          fallbackGuildId: guild.id,
        });
        fights = imported.fights;
        skipped = imported.skipped;

        if (imported.skipped) result.skipped += 1;
        else {
          result.imported += 1;
          result.fights += imported.fights;
        }
      } catch (error) {
        failed = true;
        result.failed += 1;
        await prisma.report.update({
          where: { code: report.code },
          data: {
            importState: ImportState.FAILED,
            importError: error instanceof Error ? error.message : String(error),
          },
        });
      }

      options.onProgress?.({
        index: index + 1,
        total: pending.length,
        code: report.code,
        fights,
        skipped,
        failed,
      });
    }

    const after = await client.getRateLimit();
    result.pointsSpent = after.pointsSpentThisHour - before.pointsSpentThisHour;

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SyncStatus.COMPLETED,
        finishedAt: new Date(),
        newReports: result.discovered,
        newFights: result.fights,
        pointsSpent: result.pointsSpent,
      },
    });

    return result;
  } catch (error) {
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: SyncStatus.FAILED,
        finishedAt: new Date(),
        newReports: result.discovered,
        newFights: result.fights,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
