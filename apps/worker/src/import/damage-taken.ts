import { prisma } from '@ina/db';
import { slugify } from '@ina/core';
import { WclClient, WclGraphQLError, ReportDamageTakenDocument } from '@ina/wcl';

/**
 * Imports damage taken, one fight at a time.
 *
 * One call per fight is not a design choice but a constraint: `table(dataType:
 * DamageTaken)` returns no per-fight breakdown when several fights are
 * requested together, only their sum. Requesting a whole raid night would be
 * three times cheaper, but the numbers could then only be spread across the
 * individual pulls by guessing — and half the boss groups in this history
 * contain more than one pull.
 *
 * `activeTime` comes along in the same response and is what makes "damage taken
 * per minute" possible, which is the figure that stops tanks from winning every
 * such list by default.
 */

export interface DamageTakenResult {
  fights: number;
  rows: number;
  /** Fights whose report contents Warcraft Logs has archived. */
  archived: number;
  failed: number;
}

interface TakenEntry {
  id: number;
  total: number;
  activeTime: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** table() is untyped JSON, so the shape is checked rather than trusted. */
function parseEntries(table: unknown): TakenEntry[] {
  if (!isRecord(table) || !isRecord(table.data)) return [];
  const raw = table.data.entries;
  if (!Array.isArray(raw)) return [];

  const entries: TakenEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = num(item.id);
    const total = num(item.total);
    if (id === null || total === null) continue;
    entries.push({ id, total, activeTime: num(item.activeTime) ?? 0 });
  }
  return entries;
}

function realmSlug(server: string | null | undefined): string {
  const name = server?.trim() ?? '';
  const slug = slugify(name);
  return slug === '' ? name : slug;
}

export interface FightTarget {
  id: string;
  wclFightId: number;
  reportCode: string;
}

export async function importDamageTakenForReport(
  reportCode: string,
  fights: FightTarget[],
  client: WclClient,
  onFight?: (fightId: string) => void,
): Promise<DamageTakenResult> {
  const result: DamageTakenResult = { fights: 0, rows: 0, archived: 0, failed: 0 };
  if (fights.length === 0) return result;

  // The actor table is report-wide, so it is fetched once and reused for every
  // fight of this report rather than per call.
  let actorToCharacter: Map<number, string> | null = null;

  for (const fight of fights) {
    try {
      const response = await client.query(ReportDamageTakenDocument, {
        code: reportCode,
        fightIDs: [fight.wclFightId],
      });

      const report = response.reportData?.report;
      if (!report) {
        result.failed += 1;
        continue;
      }

      if (actorToCharacter === null) {
        const region = report.region?.slug ?? 'unknown';
        actorToCharacter = new Map();
        for (const actor of report.masterData?.actors ?? []) {
          if (!actor?.id || !actor.name) continue;
          const slug = realmSlug(actor.server);
          if (slug === '') continue;

          const character = await prisma.character.findUnique({
            where: { name_realmSlug_region: { name: actor.name, realmSlug: slug, region } },
            select: { id: true },
          });
          if (character) actorToCharacter.set(actor.id, character.id);
        }
      }

      for (const entry of parseEntries(report.table)) {
        const characterId = actorToCharacter.get(entry.id);
        if (!characterId) continue;

        // Only ever updates an existing performance row. A character with no
        // row for this fight did not take part in it, and inventing one here
        // would create a participant that the fight import never saw.
        const updated = await prisma.fightPerformance.updateMany({
          where: { fightId: fight.id, characterId },
          data: {
            damageTaken: BigInt(Math.round(entry.total)),
            activeTimeMs: Math.round(entry.activeTime),
          },
        });
        result.rows += updated.count;
      }

      await prisma.fight.update({
        where: { id: fight.id },
        data: { damageTakenImported: true },
      });
      result.fights += 1;
      onFight?.(fight.id);
    } catch (error) {
      if (error instanceof WclGraphQLError && /archived/i.test(error.message)) {
        // Mark the whole report so the remaining fights are not attempted.
        await prisma.report.update({
          where: { code: reportCode },
          data: { contentsArchived: true },
        });
        result.archived += fights.length - result.fights;
        return result;
      }
      result.failed += 1;
    }
  }

  return result;
}
