import { prisma } from '@ina/db';
import { slugify } from '@ina/core';
import { WclClient, WclGraphQLError, ReportInterruptsDispelsDocument } from '@ina/wcl';

/**
 * Imports interrupts and dispels, one request per report.
 *
 * Two things about these tables were established against the live API rather
 * than assumed, and both shape this importer:
 *
 *  1. They are nested the other way round from every other table. The top
 *     level is the ABILITY that was interrupted or dispelled; the players who
 *     did it hang underneath it in `details`, and one player appears under
 *     several abilities. A player's count is a sum across that tree, never a
 *     single row.
 *
 *  2. A report-wide call is refused with "You must either provide fightIDs, or
 *     provide startTime and endTime" — but a time range covering the whole log
 *     is accepted, and costs the same handful of points as a single pull.
 *
 * Hence per report, not per fight: the whole history costs roughly 6.700
 * points and twenty minutes instead of 43.000 points and hours. What it gives
 * up is boss attribution — the response sums the entire range with no
 * breakdown and no fight id — so the data is stored at exactly the
 * granularity it was fetched at. Splitting a report total across its pulls
 * would be invention.
 *
 * The range covers ALL fights including trash, deliberately. Combat time in
 * this database covers all fights too, and a per-minute figure whose numerator
 * and denominator disagree about which pulls they mean is worse than useless.
 *
 * Pets roll up to their owner: an interrupt by a warlock's felhunter is listed
 * under the warlock, with the pet named in the breakdown. That is the API's
 * doing and it is the answer a raider expects.
 */

export interface UtilityResult {
  reports: number;
  rows: number;
  interrupts: number;
  dispels: number;
  /** Reports whose contents Warcraft Logs has archived. */
  archived: number;
  failed: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Sums per-actor totals across the ability tree.
 *
 * table() is untyped JSON, so every level is checked rather than trusted: an
 * unfamiliar shape yields no counts at all, never a wrong one.
 */
export function sumByActor(table: unknown): Map<number, number> {
  const totals = new Map<number, number>();
  if (!isRecord(table) || !isRecord(table.data)) return totals;

  const groups = table.data.entries;
  if (!Array.isArray(groups)) return totals;

  for (const group of groups) {
    if (!isRecord(group)) continue;
    // One wrapper level sits above the abilities. Tolerated in both shapes so
    // a flattened response would still be read correctly.
    const abilities = Array.isArray(group.entries) ? group.entries : [group];

    for (const ability of abilities) {
      if (!isRecord(ability) || !Array.isArray(ability.details)) continue;
      for (const detail of ability.details) {
        if (!isRecord(detail)) continue;
        const id = num(detail.id);
        const total = num(detail.total);
        if (id === null || total === null) continue;
        totals.set(id, (totals.get(id) ?? 0) + total);
      }
    }
  }

  return totals;
}

function realmSlug(server: string | null | undefined): string {
  const name = server?.trim() ?? '';
  const slug = slugify(name);
  return slug === '' ? name : slug;
}

export interface ReportTarget {
  id: string;
  code: string;
  /** Milliseconds from report start to the end of its last fight. */
  endOffsetMs: number;
}

export async function importUtilityForReport(
  report: ReportTarget,
  client: WclClient,
): Promise<UtilityResult> {
  const result: UtilityResult = {
    reports: 0,
    rows: 0,
    interrupts: 0,
    dispels: 0,
    archived: 0,
    failed: 0,
  };

  try {
    const response = await client.query(ReportInterruptsDispelsDocument, {
      code: report.code,
      // A hair past the last fight; the API wants a closed range, and the
      // report may keep running long after the raid ended.
      startTime: 0,
      endTime: report.endOffsetMs + 1000,
      killType: 'All',
    });

    const data = response.reportData?.report;
    if (!data) {
      result.failed += 1;
      return result;
    }

    const region = data.region?.slug ?? 'unknown';
    const actorToCharacter = new Map<number, string>();
    for (const actor of data.masterData?.actors ?? []) {
      if (!actor?.id || !actor.name) continue;
      const slug = realmSlug(actor.server);
      if (slug === '') continue;

      const character = await prisma.character.findUnique({
        where: { name_realmSlug_region: { name: actor.name, realmSlug: slug, region } },
        select: { id: true },
      });
      if (character) actorToCharacter.set(actor.id, character.id);
    }

    const interrupts = sumByActor(data.interrupts);
    const dispels = sumByActor(data.dispels);

    for (const actorId of new Set([...interrupts.keys(), ...dispels.keys()])) {
      const characterId = actorToCharacter.get(actorId);
      if (!characterId) continue;

      const interruptCount = interrupts.get(actorId) ?? 0;
      const dispelCount = dispels.get(actorId) ?? 0;
      if (interruptCount === 0 && dispelCount === 0) continue;

      // Upsert on the natural key, so a repeated run overwrites rather than
      // doubling — the same idempotence rule the rest of the import follows.
      await prisma.reportUtility.upsert({
        where: { reportId_characterId: { reportId: report.id, characterId } },
        create: {
          reportId: report.id,
          characterId,
          interrupts: interruptCount,
          dispels: dispelCount,
        },
        update: { interrupts: interruptCount, dispels: dispelCount },
      });

      result.rows += 1;
      result.interrupts += interruptCount;
      result.dispels += dispelCount;
    }

    await prisma.report.update({
      where: { id: report.id },
      data: { utilityImported: true },
    });
    result.reports += 1;
  } catch (error) {
    if (error instanceof WclGraphQLError && /archived/i.test(error.message)) {
      await prisma.report.update({
        where: { id: report.id },
        data: { contentsArchived: true },
      });
      result.archived += 1;
      return result;
    }
    result.failed += 1;
  }

  return result;
}
