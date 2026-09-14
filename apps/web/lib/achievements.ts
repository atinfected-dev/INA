import { prisma } from '@ina/db';
import {
  ACHIEVEMENTS,
  type AchievementDefinition,
  type AchievementTier,
  type EarnedAchievement,
  evaluateAll,
} from '@ina/core';
import { loadSubjectMetrics, type SubjectRow } from './achievement-metrics';
import { loadCustomAchievements } from './custom-content';
import { memo } from './cache';
import { MIN_NIGHTS_FOR_TITLE } from './hall-of-fame';

/**
 * Evaluation and rarity.
 *
 * Rarity is the part that needs a decision rather than a query. "Held by 2,3 %"
 * only means something if the denominator is people who could plausibly have
 * earned it. This guild's database holds 2.089 characters, most of them
 * strangers, pugs and one-night alts; measured against those, every
 * achievement would read as vanishingly rare and the number would be
 * flattering noise.
 *
 * The denominator is therefore subjects with at least as many raid nights as
 * a Hall-of-Fame title requires — the same threshold, so the site does not use
 * two different definitions of "guild member" on two pages. The count is shown
 * next to every percentage.
 */

export const RARITY_MIN_NIGHTS = MIN_NIGHTS_FOR_TITLE;

/**
 * How many eligible subjects hold each step.
 *
 * Per tier rather than per achievement, because "held by 100 %" is what a
 * bronze step is FOR, and it says nothing. The interesting number is always
 * the one on the step a raider actually reached.
 */
export type TierHolders = Partial<Record<AchievementTier, number>>;

export interface AchievementStanding {
  definition: AchievementDefinition;
  tier: AchievementTier | null;
  value: number;
  nextThreshold: number | null;
  /** Share holding the tier this subject reached, 0..1. */
  share: number;
  holders: number;
  /** Holders of every step, for the ladder shown on the card. */
  byTier: TierHolders;
}

export interface AchievementOverview {
  /** Every achievement with the holder count of each of its steps. */
  standings: { definition: AchievementDefinition; byTier: TierHolders }[];
  eligible: number;
  subjects: number;
}

interface Evaluated {
  subject: SubjectRow;
  earned: EarnedAchievement[];
}

async function computeEveryone(): Promise<{
  rows: Evaluated[];
  holders: Map<string, TierHolders>;
  eligible: number;
  definitions: AchievementDefinition[];
}> {
  // Officer-added achievements sit next to the built-in ones and go through
  // the same evaluator — there is no second kind of achievement.
  const [subjects, custom] = await Promise.all([loadSubjectMetrics(), loadCustomAchievements()]);
  const definitions: AchievementDefinition[] = [...ACHIEVEMENTS, ...custom];

  const rows = subjects.map((subject) => ({
    subject,
    earned: evaluateAll(subject.metrics, definitions),
  }));

  const holders = new Map<string, TierHolders>();
  let eligible = 0;

  for (const row of rows) {
    if (row.subject.metrics.nights < RARITY_MIN_NIGHTS) continue;
    eligible += 1;
    for (const entry of row.earned) {
      if (entry.tier === null) continue;
      const counts = holders.get(entry.definition.id) ?? {};
      // Counted on every step up to the one reached: someone holding Gold
      // also holds Bronze, and the bronze figure would otherwise read as
      // "only beginners have this".
      const reachedIndex = entry.definition.steps.findIndex((step) => step.tier === entry.tier);
      for (const step of entry.definition.steps.slice(0, reachedIndex + 1)) {
        counts[step.tier] = (counts[step.tier] ?? 0) + 1;
      }
      holders.set(entry.definition.id, counts);
    }
  }

  return { rows, holders, eligible, definitions };
}

function evaluateEveryone(): ReturnType<typeof computeEveryone> {
  return memo('achievements-everyone', computeEveryone);
}

export async function loadAchievementOverview(): Promise<AchievementOverview> {
  const { rows, holders, eligible, definitions } = await evaluateEveryone();

  return {
    standings: definitions.map((definition) => ({
      definition,
      byTier: holders.get(definition.id) ?? {},
    })),
    eligible,
    subjects: rows.length,
  };
}

export interface SubjectAchievements {
  subject: SubjectRow;
  /** Held achievements, rarest first. */
  earned: AchievementStanding[];
  /** Not yet held, closest to the next threshold first. */
  open: AchievementStanding[];
  eligible: number;
}

/**
 * One subject's standing.
 *
 * Addressed by id, never by name. Character names are only unique per realm —
 * this guild has two Dibbelabbess, one of them a stranger — so a name lookup
 * silently answers for the wrong raider, which is exactly what it did before.
 */
export async function loadAchievementsForSubject(
  subjectId: string,
): Promise<SubjectAchievements | null> {
  const { rows, holders, eligible } = await evaluateEveryone();
  const found = rows.find((row) => row.subject.subjectId === subjectId);
  if (!found) return null;

  const stand = (entry: EarnedAchievement): AchievementStanding => {
    const byTier = holders.get(entry.definition.id) ?? {};
    const count = entry.tier === null ? 0 : (byTier[entry.tier] ?? 0);
    return {
      definition: entry.definition,
      tier: entry.tier,
      value: entry.value,
      nextThreshold: entry.nextThreshold,
      holders: count,
      share: eligible === 0 ? 0 : count / eligible,
      byTier,
    };
  };

  const earned = found.earned.filter((entry) => entry.tier !== null).map(stand);
  const open = found.earned.filter((entry) => entry.tier === null).map(stand);

  earned.sort((a, b) => a.share - b.share);
  // Closest to the next step first: what a raider can realistically go for.
  open.sort((a, b) => {
    const left = a.nextThreshold === null ? 0 : a.value / a.nextThreshold;
    const right = b.nextThreshold === null ? 0 : b.value / b.nextThreshold;
    return right - left;
  });

  return { subject: found.subject, earned, open, eligible };
}

/**
 * The same, starting from one character.
 *
 * Resolves through the person where the character has been merged into one,
 * so every character of a raider answers with the raider's whole history.
 */
export async function loadAchievementsForCharacterId(
  characterId: string,
): Promise<SubjectAchievements | null> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, personId: true },
  });
  if (!character) return null;

  // The subject key, formed exactly as the metrics query forms it.
  return loadAchievementsForSubject(character.personId ?? character.id);
}

export const MAX_PINNED = 6;

/**
 * The achievements a member has pinned to their profile.
 *
 * Validated against what they actually hold, not just against the id list: an
 * achievement lost because a threshold moved should quietly disappear from the
 * profile rather than render as an award nobody can explain.
 */
export function applyPins(
  earned: AchievementStanding[],
  pinned: readonly string[],
): { pinned: AchievementStanding[]; rest: AchievementStanding[] } {
  const held = new Map(earned.map((entry) => [entry.definition.id, entry]));
  const chosen: AchievementStanding[] = [];

  for (const id of pinned.slice(0, MAX_PINNED)) {
    const entry = held.get(id);
    if (entry) {
      chosen.push(entry);
      held.delete(id);
    }
  }

  return { pinned: chosen, rest: [...held.values()] };
}

/** The account that speaks for a subject, if a member has claimed it. */
export async function findAccountForSubject(
  subjectId: string,
): Promise<{ id: string; pinnedAchievements: string[] } | null> {
  return prisma.account.findFirst({
    where: { personId: subjectId },
    select: { id: true, pinnedAchievements: true },
  });
}
