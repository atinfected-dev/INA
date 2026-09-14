/**
 * Scripted instant kills in damage-taken statistics.
 *
 * Some encounters do not deal damage to kill a player, they simply set the
 * damage to an absurd sentinel value. Sha of Pride's `Ethereal Corruption` is
 * the case that showed up in this guild's history: exactly 536.870.912 — 2^29,
 * a round binary number rather than anything a boss could roll — dealt to
 * several raiders at once when the fight was lost.
 *
 * Left in, one such pull outranks an entire expansion of honest tanking: the
 * seven affected rows sit above 540 million, while the largest real damage
 * taken in a single pull anywhere in this history is 92 million. There is no
 * overlap and no judgement call in between.
 *
 * The exclusion happens when QUERYING, never when importing. The stored
 * numbers stay exactly as Warcraft Logs reported them, so this rule can be
 * changed, tightened or dropped at any time without re-importing anything —
 * and so the raw data never quietly disagrees with the source.
 *
 * It is a blunt rule by necessity: performance is stored as one total per
 * player per pull, not broken down by ability, so a single scripted hit can
 * only be removed together with the pull it happened in. That costs those
 * players the real damage they took in that one pull, which is the smaller
 * error by far.
 */

/** 2^29 — the scripted sentinel, and the threshold at or above which a pull is ignored. */
export const SCRIPTED_DAMAGE_THRESHOLD = 536_870_912;

/** Highest real damage taken in a single pull observed in this dataset. */
export const LARGEST_REAL_DAMAGE_TAKEN = 92_067_005;

export function isScriptedDamage(value: number | bigint): boolean {
  return BigInt(value) >= BigInt(SCRIPTED_DAMAGE_THRESHOLD);
}

/** How damage taken is made comparable between tanks, healers and damage dealers. */
export const DAMAGE_TAKEN_METRICS = {
  perMinute: {
    label: 'Je Minute Kampfzeit',
    formula: 'Erlittener Schaden geteilt durch die Kampfzeit aller gewerteten Pulls.',
    reason:
      'Der einzige Wert, der einen Raider mit 300 Pulls mit einem mit 30 vergleichbar macht.',
  },
  perFight: {
    label: 'Je Pull',
    formula: 'Erlittener Schaden geteilt durch die Anzahl gewerteter Pulls.',
    reason: 'Unabhängig von der Länge der Kämpfe — lange Bosse schlagen hier stärker durch.',
  },
  total: {
    label: 'Gesamt',
    formula: 'Summe des erlittenen Schadens über alle gewerteten Pulls.',
    reason: 'Gewinnt fast immer, wer am längsten dabei war. Als Lebenswerk zu lesen, nicht als Leistung.',
  },
} as const;

export type DamageTakenMetricKey = keyof typeof DAMAGE_TAKEN_METRICS;
export const DAMAGE_TAKEN_METRIC_KEYS = Object.keys(
  DAMAGE_TAKEN_METRICS,
) as DamageTakenMetricKey[];
