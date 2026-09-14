import { prisma } from '@ina/db';
import { slugify } from '@ina/core';
import { WclClient, WorldReferenceDocument } from '@ina/wcl';

/**
 * Imports the game's reference data: expansions, raids, bosses and difficulties.
 *
 * Everything here comes from `worldData`. Nothing is hard-coded, which is what
 * makes a new Classic expansion a sync run rather than a code change.
 *
 * Safe to re-run: every write is an upsert keyed on the Warcraft Logs id, so a
 * second pass reports zero creations and leaves the rows alone.
 */

export interface ReferenceImportResult {
  expansions: { created: number; updated: number };
  zones: { created: number; updated: number };
  encounters: { created: number; updated: number };
  difficulties: { created: number; updated: number };
  /** Difficulty ids whose name differs between zones; see the note below. */
  difficultyNameConflicts: string[];
}

function emptyCounts() {
  return { created: 0, updated: 0 };
}

export async function importReferenceData(
  client: WclClient = new WclClient(),
): Promise<ReferenceImportResult> {
  const result: ReferenceImportResult = {
    expansions: emptyCounts(),
    zones: emptyCounts(),
    encounters: emptyCounts(),
    difficulties: emptyCounts(),
    difficultyNameConflicts: [],
  };

  const response = await client.query(WorldReferenceDocument, {});
  const expansions = response.worldData?.expansions ?? [];

  if (expansions.length === 0) {
    throw new Error(
      'worldData returned no expansions. Check WCL_API_HOST — Classic data only ' +
        'exists on https://classic.warcraftlogs.com.',
    );
  }

  // Difficulty ids are global, but the API reports them per zone. Track the
  // first name seen so a later zone using a different label for the same id is
  // reported rather than silently overwriting it.
  const difficultyNames = new Map<number, string>();

  for (const expansion of expansions) {
    if (!expansion) continue;

    const existingExpansion = await prisma.expansion.findUnique({
      where: { wclExpansionId: expansion.id },
      select: { id: true },
    });

    const expansionRow = await prisma.expansion.upsert({
      where: { wclExpansionId: expansion.id },
      update: { name: expansion.name, sortOrder: expansion.id },
      create: {
        wclExpansionId: expansion.id,
        name: expansion.name,
        slug: slugify(expansion.name),
        // Warcraft Logs numbers expansions chronologically (1000 Classic,
        // 1001 TBC, ...), so the id doubles as the sort order.
        sortOrder: expansion.id,
      },
    });

    if (existingExpansion) result.expansions.updated += 1;
    else result.expansions.created += 1;

    const zones = expansion.zones ?? [];
    for (const [zoneIndex, zone] of zones.entries()) {
      if (!zone) continue;

      const existingZone = await prisma.zone.findUnique({
        where: { wclZoneId: zone.id },
        select: { id: true },
      });

      const zoneRow = await prisma.zone.upsert({
        where: { wclZoneId: zone.id },
        update: {
          name: zone.name,
          frozen: zone.frozen,
          sortOrder: zoneIndex,
          expansionId: expansionRow.id,
        },
        create: {
          wclZoneId: zone.id,
          name: zone.name,
          slug: slugify(zone.name),
          frozen: zone.frozen,
          sortOrder: zoneIndex,
          expansionId: expansionRow.id,
        },
      });

      if (existingZone) result.zones.updated += 1;
      else result.zones.created += 1;

      for (const difficulty of zone.difficulties ?? []) {
        if (!difficulty) continue;

        const knownName = difficultyNames.get(difficulty.id);
        if (knownName === undefined) {
          difficultyNames.set(difficulty.id, difficulty.name);
        } else if (knownName !== difficulty.name) {
          const conflict = `${difficulty.id}: "${knownName}" vs "${difficulty.name}" (${zone.name})`;
          if (!result.difficultyNameConflicts.includes(conflict)) {
            result.difficultyNameConflicts.push(conflict);
          }
        }

        const existingDifficulty = await prisma.difficulty.findUnique({
          where: { wclDifficultyId: difficulty.id },
          select: { id: true },
        });

        const difficultyRow = await prisma.difficulty.upsert({
          where: { wclDifficultyId: difficulty.id },
          update: {},
          create: { wclDifficultyId: difficulty.id, name: difficulty.name },
        });

        if (existingDifficulty) result.difficulties.updated += 1;
        else result.difficulties.created += 1;

        const sizes = (difficulty.sizes ?? []).filter((s): s is number => s !== null);
        await prisma.zoneDifficulty.upsert({
          where: {
            zoneId_difficultyId: { zoneId: zoneRow.id, difficultyId: difficultyRow.id },
          },
          update: { sizes },
          create: { zoneId: zoneRow.id, difficultyId: difficultyRow.id, sizes },
        });
      }

      const encounters = zone.encounters ?? [];
      for (const [encounterIndex, encounter] of encounters.entries()) {
        if (!encounter) continue;

        const existingEncounter = await prisma.encounter.findUnique({
          where: { wclEncounterId: encounter.id },
          select: { id: true },
        });

        await prisma.encounter.upsert({
          where: { wclEncounterId: encounter.id },
          update: {
            name: encounter.name,
            journalId: encounter.journalID,
            sortOrder: encounterIndex,
            zoneId: zoneRow.id,
          },
          create: {
            wclEncounterId: encounter.id,
            name: encounter.name,
            slug: slugify(encounter.name),
            journalId: encounter.journalID,
            sortOrder: encounterIndex,
            zoneId: zoneRow.id,
          },
        });

        if (existingEncounter) result.encounters.updated += 1;
        else result.encounters.created += 1;
      }
    }
  }

  return result;
}
