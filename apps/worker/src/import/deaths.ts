import { prisma, type Prisma } from '@ina/db';
import { slugify } from '@ina/core';
import { WclClient, WclGraphQLError, ReportDeathsDocument } from '@ina/wcl';

/**
 * Imports individual death events.
 *
 * This is the one place where raw events are stored rather than aggregates.
 * The reason is specific: without them, "wie ist der gestorben" is unanswerable,
 * and death causes are an explicit requirement. The volume stays modest —
 * roughly 200 deaths per raid night against 25 players times every pull.
 *
 * `table(dataType: Deaths)` carries the fight id on every entry, so a single
 * call per report produces per-fight deaths with no time matching, and
 * `killingBlow` names the ability outright. Nothing about the cause is
 * inferred; where the log does not name it, the field stays null and the UI
 * says "unbekannt".
 */

export interface DeathsImportResult {
  code: string;
  skipped: boolean;
  skippedReason?: string;
  /** The log is archived; its contents need the user-authenticated endpoint. */
  archived: boolean;
  deaths: number;
  /** Deaths the log did not attribute to an ability. */
  withoutCause: number;
  unresolvedActors: string[];
}

interface DeathEntry {
  /** Report-local actor id, resolved through masterData. */
  id: number;
  /** Milliseconds relative to the report start. */
  timestamp: number;
  /** Warcraft Logs fight id within the report. */
  fight: number;
  killingBlow: { name?: unknown; guid?: unknown } | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/** table() is untyped JSON; the shape is checked rather than assumed. */
function parseDeathEntries(table: unknown): DeathEntry[] {
  if (!isRecord(table) || !isRecord(table.data)) return [];
  const raw = table.data.entries;
  if (!Array.isArray(raw)) return [];

  const entries: DeathEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = num(item.id);
    const timestamp = num(item.timestamp);
    const fight = num(item.fight);
    if (id === null || timestamp === null || fight === null) continue;

    entries.push({
      id,
      timestamp,
      fight,
      killingBlow: isRecord(item.killingBlow) ? item.killingBlow : null,
    });
  }
  return entries;
}

/** Same rule as the fight import: slug for latin realms, raw name otherwise. */
function realmIdentity(server: string | null | undefined): { name: string; slug: string } {
  const name = server?.trim() ?? '';
  const slug = slugify(name);
  return { name, slug: slug === '' ? name : slug };
}

export async function importDeaths(
  code: string,
  client: WclClient = new WclClient(),
): Promise<DeathsImportResult> {
  const result: DeathsImportResult = {
    code,
    skipped: false,
    archived: false,
    deaths: 0,
    withoutCause: 0,
    unresolvedActors: [],
  };

  const report = await prisma.report.findUnique({
    where: { code },
    select: {
      id: true,
      // Deaths on wipes are the interesting ones, so every fight counts here,
      // not just the kills.
      fights: { select: { id: true, wclFightId: true } },
    },
  });

  if (!report || report.fights.length === 0) {
    result.skipped = true;
    result.skippedReason = report ? 'No fights imported.' : 'Report not imported yet.';
    return result;
  }

  // Warcraft Logs archives report CONTENTS after roughly two years. Rankings
  // survive — which is why the parses imported fine — but table() does not, and
  // reaching archived contents needs the user-authenticated endpoint rather
  // than an application token. Treated as a known state, not a failure.
  let response;
  try {
    response = await client.query(ReportDeathsDocument, {
      code,
      fightIDs: report.fights.map((f) => f.wclFightId),
    });
  } catch (error) {
    if (error instanceof WclGraphQLError && /archived/i.test(error.message)) {
      result.skipped = true;
      result.archived = true;
      result.skippedReason = 'Report archiviert — Inhalte nur über den User-Endpunkt erreichbar.';
      return result;
    }
    throw error;
  }

  const payload = response.reportData?.report;
  if (!payload) {
    result.skipped = true;
    result.skippedReason = 'Report not visible to this API client.';
    return result;
  }

  const entries = parseDeathEntries(payload.table);
  if (entries.length === 0) {
    // A flawless night. Still counts as imported.
    await prisma.deathEvent.deleteMany({
      where: { fightId: { in: report.fights.map((f) => f.id) } },
    });
    return result;
  }

  const region = payload.region?.slug ?? 'unknown';
  const fightByWclId = new Map(report.fights.map((f) => [f.wclFightId, f.id]));

  // Actor ids are report-local; resolve them to characters exactly as the
  // fight import does, so both passes agree on who a player is.
  const characterByActor = new Map<number, string>();
  const unresolved = new Set<string>();

  for (const actor of payload.masterData?.actors ?? []) {
    if (!actor?.id || !actor.name) continue;
    const realm = realmIdentity(actor.server);
    if (realm.slug === '') continue;

    const character = await prisma.character.findUnique({
      where: { name_realmSlug_region: { name: actor.name, realmSlug: realm.slug, region } },
      select: { id: true },
    });

    if (character) characterByActor.set(actor.id, character.id);
  }

  const rows: Prisma.DeathEventCreateManyInput[] = [];
  for (const entry of entries) {
    const fightId = fightByWclId.get(entry.fight);
    const characterId = characterByActor.get(entry.id);
    if (!fightId) continue;
    if (!characterId) {
      unresolved.add(String(entry.id));
      continue;
    }

    const abilityName = str(entry.killingBlow?.name);
    const abilityId = num(entry.killingBlow?.guid);
    if (abilityName === null) result.withoutCause += 1;

    rows.push({
      fightId,
      characterId,
      timestampMs: Math.round(entry.timestamp),
      abilityId,
      abilityName,
      // The log names the ability but not the actor behind it in a way that can
      // be matched reliably, so this stays empty rather than being guessed.
      sourceName: null,
    });
  }

  // Replace rather than append: DeathEvent has no natural unique key, so a
  // re-import would otherwise duplicate every death.
  await prisma.deathEvent.deleteMany({
    where: { fightId: { in: report.fights.map((f) => f.id) } },
  });

  if (rows.length > 0) {
    const created = await prisma.deathEvent.createMany({ data: rows });
    result.deaths = created.count;
  }

  result.unresolvedActors = [...unresolved];
  return result;
}
