import {
  TIER_LABELS,
  rarityLabel,
  type AchievementDefinition,
  type AchievementTier,
} from '@ina/core';
import type { TierHolders } from '../../lib/achievements';
import { formatAmount, formatNumber } from '../../lib/wow';
import styles from '../../app/erfolge/achievements.module.css';

/**
 * One achievement card.
 *
 * Every step of the ladder is shown, held or not, each with the share of the
 * guild that reached it. Rarity belongs on the STEP, not on the achievement:
 * "Pull Machine, held by 100 %" is what a bronze step is for and says nothing,
 * while "Diamant, 2 %" is the number worth printing.
 */

export interface CardProps {
  definition: AchievementDefinition;
  byTier: TierHolders;
  eligible: number;
  /** Omitted on the guild-wide overview, where there is no personal value. */
  tier?: AchievementTier | null;
  value?: number;
  nextThreshold?: number | null;
}

export function formatMetric(value: number, unit: AchievementDefinition['unit']): string {
  if (unit === 'hours') return `${formatNumber(Math.floor(value / 3_600_000))} Std.`;
  if (unit === 'amount') return formatAmount(value);
  return formatNumber(value);
}

export function AchievementCard({
  definition,
  byTier,
  eligible,
  tier = undefined,
  value,
  nextThreshold,
}: CardProps) {
  const held = tier != null;
  const heldIndex = held ? definition.steps.findIndex((step) => step.tier === tier) : -1;

  const heldHolders = held ? (byTier[tier] ?? 0) : 0;
  const heldShare = eligible === 0 ? 0 : heldHolders / eligible;

  return (
    <article className={held ? styles.cardEarned : styles.card}>
      <div className={styles.head}>
        <h3 className={styles.name}>{definition.name}</h3>
        {held && <span className={styles[tier]}>{TIER_LABELS[tier]}</span>}
      </div>

      <p className={styles.description}>{definition.description}</p>

      <div className={styles.steps}>
        {definition.steps.map((step, index) => {
          const holders = byTier[step.tier] ?? 0;
          const share = eligible === 0 ? 0 : holders / eligible;
          return (
            <span
              key={step.tier}
              className={`${index <= heldIndex ? styles.stepReached : styles.step} ${styles[step.tier]}`}
              title={`${formatNumber(holders)} von ${formatNumber(eligible)} Raidern`}
            >
              {TIER_LABELS[step.tier]} {formatMetric(step.threshold, definition.unit)} ·{' '}
              {formatNumber(share * 100, share < 0.1 ? 1 : 0)} %
            </span>
          );
        })}
      </div>

      {value !== undefined && (
        <p className={styles.progress}>
          {formatMetric(value, definition.unit)}
          {nextThreshold != null && (
            <> · noch {formatMetric(Math.max(0, nextThreshold - value), definition.unit)}</>
          )}
        </p>
      )}

      {held && (
        <p className={heldShare <= 0.1 ? styles.rarityRare : styles.rarity}>
          {rarityLabel(heldShare)} · {TIER_LABELS[tier]} haben{' '}
          {formatNumber(heldShare * 100, 1)} % der Raider
        </p>
      )}
    </article>
  );
}
