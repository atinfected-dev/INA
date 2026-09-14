import { prisma, ImportState, type Prisma } from '@ina/db';
import { slugify } from '@ina/core';
import { WclClient, ReportFightsDocument } from '@ina/wcl';

/**
 * Imports one Warcraft Logs report: the report row, its boss fights, the
 * characters that took part, and the participant links between them.
 *
 * Deliberately not imported here: per-fight performance numbers and parse
 * percentiles. Those need separate `table()` and `rankings()` calls and are
 * handled in their own step, so a failure there cannot roll back the fights.
 *
 * Idempotent. The report `code` is the unique key, so a second run updates
 * rather than duplicates. A report is re-imported only when Warcraft Logs
 * bumped its `revision`, which is what happens when a log is reprocessed.
 */

export interface ReportImportResult {
  code: string;
  skipped: boolean;
  skippedReason?: string;
  fights: number;
  charactersCreated: number;
  participants: number;
  /** Fights whose encounter is not in the reference data — reference sync needed. */
  unknownEncounterIds: number[];
}

export interface ImportReportOptions {
  /** Re-import even when the stored revision already matches. */
  force?: boolean;
  /**
   * Guild to attribute the report to when the log itself carries no guild
   * (personal logs). Ignored when the report names a guild.
   */
  fallbackGuildId?: string;
}

/**
 * Realm identity.
 *
 * masterData actors report a realm NAME ("Everlook", "霜语"), never a slug.
 * Slugifying is right for latin realms; for CJK realms it produces an empty
 * string, so the raw name is used instead. Either way the value is stable for
 * a given realm, which is all the identity key needs.
 */
function realmIdentity(server: string | null | undefined): { name: string; slug: string } {
  const name = server?.trim() ?? '';
  const slug = slugify(name);
  return { name, slug: slug === '' ? name : slug };
}

export async function importReport(
  code: string,
  client: WclClient = new WclClient(),
  options: ImportReportOptions = {},
): Promise<ReportImportResult> {
  const result: ReportImportResult = {
    code,
    skipped: false,
    fights: 0,
    charactersCreated: 0,
    participants: 0,
    unknownEncounterIds: [],
  };

  const response = await client.query(ReportFightsDocument, { code, killType: 'Encounters' });
  const report = response.reportData?.report;

  if (!report) {
    result.skipped = true;
    result.skippedReason = 'Report not found or not visible to this API client.';
    return result;
  }

  // --- Guild --------------------------------------------------------------
  const guildId = await resolveGuildId(report, options.fallbackGuildId);
  if (!guildId) {
    result.skipped = true;
    result.skippedReason =
      'Report carries no guild and no fallback guild was given (personal log).';
    return result;
  }

  // --- Skip unchanged reports --------------------------------------------
  const existing = await prisma.report.findUnique({
    where: { code },
    select: { id: true, revision: true, importState: true },
  });

  if (
    existing &&
    !options.force &&
    existing.revision === report.revision &&
    existing.importState !== ImportState.DISCOVERED &&
    existing.importState !== ImportState.FAILED
  ) {
    result.skipped = true;
    result.skippedReason = `Unchanged (revision ${report.revision}).`;
    return result;
  }

  const zone = report.zone
    ? await prisma.zone.findUnique({ where: { wclZoneId: report.zone.id }, select: { id: true } })
    : null;

  const reportRow = await prisma.report.upsert({
    where: { code },
    update: {
      title: report.title,
      startTime: new Date(report.startTime),
      endTime: new Date(report.endTime),
      revision: report.revision,
      visibility: report.visibility,
      zoneId: zone?.id ?? null,
      guildId,
      importError: null,
    },
    create: {
      code,
      guildId,
      title: report.title,
      startTime: new Date(report.startTime),
      endTime: new Date(report.endTime),
      revision: report.revision,
      visibility: report.visibility,
      zoneId: zone?.id ?? null,
    },
  });

  // --- Characters ---------------------------------------------------------
  // Actor ids are report-local; this map translates them to our character ids
  // when walking the fights' parallel player arrays.
  const region = report.region?.slug ?? report.guild?.server?.region?.slug ?? 'unknown';
  const actorToCharacter = new Map<number, string>();
  const reportStart = new Date(report.startTime);
  const reportEnd = new Date(report.endTime);

  for (const actor of report.masterData?.actors ?? []) {
    if (!actor?.id || !actor.name) continue;

    const realm = realmIdentity(actor.server);
    if (realm.slug === '') continue; // No realm at all: cannot form an identity.

    const existingCharacter = await prisma.character.findUnique({
      where: {
        name_realmSlug_region: { name: actor.name, realmSlug: realm.slug, region },
      },
      select: { id: true, firstSeenAt: true, lastSeenAt: true },
    });

    if (!existingCharacter) result.charactersCreated += 1;

    const character = await prisma.character.upsert({
      where: {
        name_realmSlug_region: { name: actor.name, realmSlug: realm.slug, region },
      },
      update: {
        // Class comes from the log; never overwrite a known class with null.
        ...(actor.subType ? { className: actor.subType } : {}),
        realmName: realm.name,
        firstSeenAt: minDate(existingCharacter?.firstSeenAt, reportStart),
        lastSeenAt: maxDate(existingCharacter?.lastSeenAt, reportEnd),
      },
      create: {
        name: actor.name,
        realmName: realm.name,
        realmSlug: realm.slug,
        region,
        className: actor.subType ?? null,
        firstSeenAt: reportStart,
        lastSeenAt: reportEnd,
      },
      select: { id: true },
    });

    actorToCharacter.set(actor.id, character.id);
  }

  // --- Fights and participants -------------------------------------------
  const encounterCache = new Map<number, string | null>();
  const difficultyCache = new Map<number, string | null>();

  for (const fight of report.fights ?? []) {
    // encounterID 0 is trash; killType: Encounters should exclude it, but the
    // check keeps a stray trash fight out of the boss statistics.
    if (!fight || fight.encounterID === 0) continue;

    const encounterId = await lookupEncounter(fight.encounterID, encounterCache);
    if (encounterId === null && !result.unknownEncounterIds.includes(fight.encounterID)) {
      result.unknownEncounterIds.push(fight.encounterID);
    }

    const difficultyId =
      fight.difficulty === null ? null : await lookupDifficulty(fight.difficulty, difficultyCache);

    // The API returns fight times as offsets from the report start.
    const startOffsetMs = Math.round(fight.startTime);
    const endOffsetMs = Math.round(fight.endTime);

    const fightRow = await prisma.fight.upsert({
      where: { reportId_wclFightId: { reportId: reportRow.id, wclFightId: fight.id } },
      update: {
        wclEncounterId: fight.encounterID,
        encounterId,
        difficultyId,
        wclDifficulty: fight.difficulty,
        size: fight.size,
        kill: fight.kill,
        startOffsetMs,
        endOffsetMs,
        startTime: new Date(report.startTime + startOffsetMs),
        endTime: new Date(report.startTime + endOffsetMs),
        durationMs: endOffsetMs - startOffsetMs,
        bossPercentage: fight.bossPercentage,
        fightPercentage: fight.fightPercentage,
        lastPhase: fight.lastPhase,
        averageItemLevel: fight.averageItemLevel,
        hardModeLevel: fight.hardModeLevel,
        completeRaid: fight.completeRaid,
        wipeCalledMs: fight.wipeCalledTime === null ? null : Math.round(fight.wipeCalledTime),
      },
      create: {
        reportId: reportRow.id,
        wclFightId: fight.id,
        wclEncounterId: fight.encounterID,
        encounterId,
        difficultyId,
        wclDifficulty: fight.difficulty,
        size: fight.size,
        kill: fight.kill,
        startOffsetMs,
        endOffsetMs,
        startTime: new Date(report.startTime + startOffsetMs),
        endTime: new Date(report.startTime + endOffsetMs),
        durationMs: endOffsetMs - startOffsetMs,
        bossPercentage: fight.bossPercentage,
        fightPercentage: fight.fightPercentage,
        lastPhase: fight.lastPhase,
        averageItemLevel: fight.averageItemLevel,
        hardModeLevel: fight.hardModeLevel,
        completeRaid: fight.completeRaid,
        wipeCalledMs: fight.wipeCalledTime === null ? null : Math.round(fight.wipeCalledTime),
      },
      select: { id: true },
    });

    result.fights += 1;

    // friendlyPlayers, friendlySpecs and friendlyItemLevels are index-aligned.
    const players = fight.friendlyPlayers ?? [];
    const specs = fight.friendlySpecs ?? [];
    const itemLevels = fight.friendlyItemLevels ?? [];

    const rows: Prisma.FightParticipantCreateManyInput[] = [];
    for (const [index, actorId] of players.entries()) {
      if (actorId === null) continue;
      const characterId = actorToCharacter.get(actorId);
      if (!characterId) continue; // Pet or an actor without a resolvable realm.

      rows.push({
        fightId: fightRow.id,
        characterId,
        spec: specs[index] ?? null,
        itemLevel: itemLevels[index] ?? null,
      });
    }

    if (rows.length > 0) {
      // skipDuplicates keeps the re-import path cheap: the unique key makes a
      // second run a no-op instead of an error.
      const created = await prisma.fightParticipant.createMany({
        data: rows,
        skipDuplicates: true,
      });
      result.participants += created.count;
    }
  }

  await prisma.report.update({
    where: { id: reportRow.id },
    data: { importState: ImportState.FIGHTS_IMPORTED, importedAt: new Date() },
  });

  return result;
}

// --- helpers ---------------------------------------------------------------

async function resolveGuildId(
  report: {
    guild?: {
      id: number;
      name: string;
      faction?: { name: string } | null;
      server?: { slug: string; region?: { slug: string } | null } | null;
    } | null;
  },
  fallbackGuildId: string | undefined,
): Promise<string | null> {
  const guild = report.guild;
  if (!guild) return fallbackGuildId ?? null;

  const serverSlug = guild.server?.slug ?? 'unknown';
  const serverRegion = guild.server?.region?.slug ?? 'unknown';
  const faction = guild.faction?.name ?? null;

  // Two ways a guild can already exist, and both must be honoured:
  //
  //  * by wclGuildId, once an import has attached it
  //  * by name/realm/region, which is how the seed creates the configured guild
  //    from .env — that row has no wclGuildId yet
  //
  // Upserting on wclGuildId alone would try to insert a second row for the
  // seeded guild and hit the name/realm/region unique constraint.
  const byWclId = await prisma.guild.findUnique({
    where: { wclGuildId: guild.id },
    select: { id: true },
  });

  if (byWclId) {
    await prisma.guild.update({
      where: { id: byWclId.id },
      data: { name: guild.name, serverSlug, serverRegion, faction },
    });
    return byWclId.id;
  }

  const byName = await prisma.guild.findUnique({
    where: {
      name_serverSlug_serverRegion: { name: guild.name, serverSlug, serverRegion },
    },
    select: { id: true },
  });

  if (byName) {
    // First import for the configured guild: attach the Warcraft Logs id.
    await prisma.guild.update({
      where: { id: byName.id },
      data: { wclGuildId: guild.id, faction },
    });
    return byName.id;
  }

  const created = await prisma.guild.create({
    data: { wclGuildId: guild.id, name: guild.name, serverSlug, serverRegion, faction },
    select: { id: true },
  });

  return created.id;
}

async function lookupEncounter(
  wclEncounterId: number,
  cache: Map<number, string | null>,
): Promise<string | null> {
  const cached = cache.get(wclEncounterId);
  if (cached !== undefined) return cached;

  const row = await prisma.encounter.findUnique({
    where: { wclEncounterId },
    select: { id: true },
  });
  const id = row?.id ?? null;
  cache.set(wclEncounterId, id);
  return id;
}

async function lookupDifficulty(
  wclDifficultyId: number,
  cache: Map<number, string | null>,
): Promise<string | null> {
  const cached = cache.get(wclDifficultyId);
  if (cached !== undefined) return cached;

  const row = await prisma.difficulty.findUnique({
    where: { wclDifficultyId },
    select: { id: true },
  });
  const id = row?.id ?? null;
  cache.set(wclDifficultyId, id);
  return id;
}

function minDate(current: Date | null | undefined, candidate: Date): Date {
  return current && current < candidate ? current : candidate;
}

function maxDate(current: Date | null | undefined, candidate: Date): Date {
  return current && current > candidate ? current : candidate;
}
