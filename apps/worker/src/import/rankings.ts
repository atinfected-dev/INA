import { prisma, ImportState, ParseMetric, type Prisma } from '@ina/db';
import { WclClient, ReportRankingsDocument } from '@ina/wcl';

/**
 * Imports parse percentiles and per-fight performance from `report.rankings`.
 *
 * Two calls per report carry almost everything the leaderboards need:
 *
 *  * `playerMetric: dps`  — parse percentiles and DPS for tanks and damage
 *  * `playerMetric: hps`  — parse percentiles and HPS for healers
 *
 * Both are required. Asking only for dps gives a healer their (meaningless)
 * damage parse: in a verified sample a Restoration Druid showed 5.993 with
 * parse 80 under dps, and 328.099 with parse 43 under hps. Storing the former
 * as "their parse" would be plainly wrong.
 *
 * Totals are derived rather than fetched. `amount * duration / 1000`
 * reproduces the value `table(dataType: DamageDone)` reports for the same
 * player exactly — verified across six players at 0.00 % deviation — so the
 * thousands of extra table() calls that would cost are not made.
 *
 * Warcraft Logs ranks kills only. Wipes therefore produce no rows here, which
 * the UI states rather than silently showing a smaller sample.
 */

export interface RankingsImportResult {
  code: string;
  skipped: boolean;
  skippedReason?: string;
  fights: number;
  performances: number;
  parses: number;
  /** Characters named in the rankings that no fight participation matched. */
  unresolvedCharacters: string[];
}

// --- Response shape --------------------------------------------------------
// rankings() is typed as JSON, so the shape is validated here rather than
// assumed. Anything unexpected is skipped, never guessed at.

interface RankedServer {
  name?: unknown;
  region?: unknown;
}

interface RankedCharacter {
  id?: unknown;
  name?: unknown;
  server?: RankedServer;
  class?: unknown;
  spec?: unknown;
  amount?: unknown;
  bracketData?: unknown;
  bracketPercent?: unknown;
  rankPercent?: unknown;
}

interface RankedFight {
  fightID: number;
  duration: number;
  partition: number | null;
  roles: Partial<Record<RoleKey, { characters: RankedCharacter[] }>>;
}

const ROLE_KEYS = ['tanks', 'healers', 'dps'] as const;
type RoleKey = (typeof ROLE_KEYS)[number];

const ROLE_LABEL: Record<RoleKey, string> = {
  tanks: 'Tank',
  healers: 'Healer',
  dps: 'DPS',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function parseRankedFights(payload: unknown): RankedFight[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return [];

  const fights: RankedFight[] = [];
  for (const raw of payload.data) {
    if (!isRecord(raw)) continue;
    const fightID = num(raw.fightID);
    const duration = num(raw.duration);
    if (fightID === null || duration === null) continue;

    const roles: RankedFight['roles'] = {};
    if (isRecord(raw.roles)) {
      for (const key of ROLE_KEYS) {
        const bucket = raw.roles[key];
        if (isRecord(bucket) && Array.isArray(bucket.characters)) {
          roles[key] = { characters: bucket.characters.filter(isRecord) };
        }
      }
    }

    fights.push({ fightID, duration, partition: num(raw.partition), roles });
  }
  return fights;
}

/**
 * Realm names are not spelled consistently between endpoints — masterData
 * reports "MirageRaceway" where rankings report "Mirage Raceway". Comparing
 * on alphanumerics only makes both forms match.
 */
function realmKey(realm: string): string {
  const normalised = realm.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalised === '' ? realm : normalised;
}

/** Resolves ranked characters to rows already created by the fight import. */
class CharacterResolver {
  readonly #cache = new Map<string, string | null>();
  readonly unresolved = new Set<string>();

  async resolve(
    name: string,
    realm: string,
    region: string,
    wclId: number | null,
    className: string | null = null,
  ) {
    const key = `${name}|${realmKey(realm)}|${region.toUpperCase()}`;
    const cached = this.#cache.get(key);
    if (cached !== undefined) return cached;

    // Narrow by the indexed columns, then match the realm on its normalised
    // form, which the database cannot express as an index lookup.
    const candidates = await prisma.character.findMany({
      where: { name, region: { equals: region, mode: 'insensitive' } },
      select: { id: true, realmName: true, wclCharacterId: true, className: true },
    });

    const match =
      candidates.find((c) => realmKey(c.realmName) === realmKey(realm)) ??
      (candidates.length === 1 ? candidates[0] : undefined);

    if (!match) {
      this.#cache.set(key, null);
      this.unresolved.add(`${name}-${realm}`);
      return null;
    }

    // Attach the Warcraft Logs character id the first time it is seen; it makes
    // later lookups exact and links the profile to the site. Rankings also
    // carry a reliable class, where masterData sometimes reports "Unknown".
    const patch: Prisma.CharacterUpdateInput = {};
    if (wclId !== null && match.wclCharacterId === null) patch.wclCharacterId = wclId;
    if (className && (match.className === null || match.className === 'Unknown')) {
      patch.className = className;
    }

    if (Object.keys(patch).length > 0) {
      await prisma.character
        .update({ where: { id: match.id }, data: patch })
        // Another character may already hold this id after a rename; not worth
        // failing an import over.
        .catch(() => undefined);
    }

    this.#cache.set(key, match.id);
    return match.id;
  }
}

interface PerformanceDraft {
  role: string;
  spec: string | null;
  itemLevel: number | null;
  dps: number;
  hps: number;
  damageDone: bigint;
  healingDone: bigint;
}

export async function importRankings(
  code: string,
  client: WclClient = new WclClient(),
  options: { force?: boolean } = {},
): Promise<RankingsImportResult> {
  const result: RankingsImportResult = {
    code,
    skipped: false,
    fights: 0,
    performances: 0,
    parses: 0,
    unresolvedCharacters: [],
  };

  const report = await prisma.report.findUnique({
    where: { code },
    select: {
      id: true,
      importState: true,
      fights: {
        where: { kill: true },
        select: { id: true, wclFightId: true },
      },
    },
  });

  if (!report) {
    result.skipped = true;
    result.skippedReason = 'Report not imported yet.';
    return result;
  }

  if (report.importState === ImportState.ANALYZED && !options.force) {
    result.skipped = true;
    result.skippedReason = 'Already analyzed.';
    return result;
  }

  if (report.fights.length === 0) {
    // A wipe-only night is complete as soon as its fights are in; Warcraft Logs
    // has nothing to rank.
    await prisma.report.update({
      where: { id: report.id },
      data: { importState: ImportState.ANALYZED },
    });
    result.skipped = true;
    result.skippedReason = 'No kills — nothing to rank.';
    return result;
  }

  const fightIds = report.fights.map((f) => f.wclFightId);
  const fightByWclId = new Map(report.fights.map((f) => [f.wclFightId, f.id]));

  const [dpsPayload, hpsPayload] = await Promise.all([
    client.query(ReportRankingsDocument, {
      code,
      fightIDs: fightIds,
      playerMetric: 'dps',
      // Historical percentiles are frozen; "Today" shifts as the partition
      // fills up, which would make a long-term history unstable.
      timeframe: 'Historical',
    }),
    client.query(ReportRankingsDocument, {
      code,
      fightIDs: fightIds,
      playerMetric: 'hps',
      timeframe: 'Historical',
    }),
  ]);

  const dpsFights = parseRankedFights(dpsPayload.reportData?.report?.rankings);
  const hpsFights = parseRankedFights(hpsPayload.reportData?.report?.rankings);
  const hpsByFight = new Map(hpsFights.map((f) => [f.fightID, f]));

  const resolver = new CharacterResolver();

  for (const fight of dpsFights) {
    const fightId = fightByWclId.get(fight.fightID);
    if (!fightId) continue;

    const durationSeconds = fight.duration / 1000;
    const hpsFight = hpsByFight.get(fight.fightID);

    // characterId -> draft, merged from both calls before writing.
    const drafts = new Map<string, PerformanceDraft>();
    const parses: Prisma.ParseRankingCreateManyInput[] = [];

    for (const roleKey of ROLE_KEYS) {
      for (const character of fight.roles[roleKey]?.characters ?? []) {
        const name = str(character.name);
        const realm = str((character.server as RankedServer | undefined)?.name);
        const region = str((character.server as RankedServer | undefined)?.region);
        if (!name || !realm || !region) continue;

        const characterId = await resolver.resolve(
          name,
          realm,
          region,
          num(character.id),
          str(character.class),
        );
        if (!characterId) continue;

        const amount = num(character.amount) ?? 0;
        drafts.set(characterId, {
          role: ROLE_LABEL[roleKey],
          spec: str(character.spec),
          itemLevel: num(character.bracketData),
          dps: amount,
          hps: 0,
          damageDone: BigInt(Math.round(amount * durationSeconds)),
          healingDone: 0n,
        });

        // Tanks and damage dealers are ranked on damage. A healer's damage
        // parse is noise, so it is not stored as their parse.
        const rankPercent = num(character.rankPercent);
        if (roleKey !== 'healers' && rankPercent !== null) {
          parses.push({
            fightId,
            characterId,
            metric: ParseMetric.DPS,
            rankPercent,
            bracketPercent: num(character.bracketPercent),
            spec: str(character.spec),
            partition: fight.partition,
          });
        }
      }
    }

    for (const roleKey of ROLE_KEYS) {
      for (const character of hpsFight?.roles[roleKey]?.characters ?? []) {
        const name = str(character.name);
        const realm = str((character.server as RankedServer | undefined)?.name);
        const region = str((character.server as RankedServer | undefined)?.region);
        if (!name || !realm || !region) continue;

        const characterId = await resolver.resolve(
          name,
          realm,
          region,
          num(character.id),
          str(character.class),
        );
        if (!characterId) continue;

        const amount = num(character.amount) ?? 0;
        const draft = drafts.get(characterId);
        if (draft) {
          draft.hps = amount;
          draft.healingDone = BigInt(Math.round(amount * durationSeconds));
        } else {
          drafts.set(characterId, {
            role: ROLE_LABEL[roleKey],
            spec: str(character.spec),
            itemLevel: num(character.bracketData),
            dps: 0,
            hps: amount,
            damageDone: 0n,
            healingDone: BigInt(Math.round(amount * durationSeconds)),
          });
        }

        const rankPercent = num(character.rankPercent);
        if (roleKey === 'healers' && rankPercent !== null) {
          parses.push({
            fightId,
            characterId,
            metric: ParseMetric.HPS,
            rankPercent,
            bracketPercent: num(character.bracketPercent),
            spec: str(character.spec),
            partition: fight.partition,
          });
        }
      }
    }

    for (const [characterId, draft] of drafts) {
      await prisma.fightPerformance.upsert({
        where: { fightId_characterId: { fightId, characterId } },
        update: {
          role: draft.role,
          spec: draft.spec,
          itemLevel: draft.itemLevel === null ? null : Math.round(draft.itemLevel),
          dps: draft.dps,
          hps: draft.hps,
          damageDone: draft.damageDone,
          healingDone: draft.healingDone,
        },
        create: {
          fightId,
          characterId,
          role: draft.role,
          spec: draft.spec,
          itemLevel: draft.itemLevel === null ? null : Math.round(draft.itemLevel),
          dps: draft.dps,
          hps: draft.hps,
          damageDone: draft.damageDone,
          healingDone: draft.healingDone,
        },
      });
      result.performances += 1;
    }

    if (parses.length > 0) {
      // A re-run must not duplicate; the unique key makes this a no-op.
      await prisma.parseRanking.deleteMany({ where: { fightId } });
      const created = await prisma.parseRanking.createMany({ data: parses });
      result.parses += created.count;
    }

    result.fights += 1;
  }

  result.unresolvedCharacters = [...resolver.unresolved];

  await prisma.report.update({
    where: { id: report.id },
    data: { importState: ImportState.ANALYZED },
  });

  return result;
}
