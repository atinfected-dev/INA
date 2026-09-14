import type { ReactNode } from 'react';
import { classVar, parseBracket, parseColorVar } from '../../lib/wow';
import styles from './bits.module.css';

/** A player name in its class colour. */
export function ClassName({
  name,
  className: wowClass,
}: {
  name: string;
  className?: string | null;
}) {
  return <span style={{ color: classVar(wowClass) }}>{name}</span>;
}

/**
 * A parse percentile in Warcraft Logs' quality colouring.
 *
 * The title attribute names the bracket, so the colour is never the only
 * carrier of meaning.
 */
export function ParseValue({ value, decimals = 1 }: { value: number; decimals?: number }) {
  const bracket = parseBracket(value);
  const isChase = value >= 99;
  return (
    <span
      className={`${styles.parse}${isChase ? ` ${styles.parseHigh}` : ''}`}
      style={{ color: parseColorVar(value) }}
      title={bracket.label}
    >
      {value.toFixed(decimals)}
    </span>
  );
}

/**
 * The number of fights an average is based on.
 *
 * Rendered beside every averaged statistic on purpose: it is what lets a reader
 * see that a 100.0 from one kill is not the same as a 96.2 from 150.
 */
export function SampleSize({ n, unit = 'Kills' }: { n: number; unit?: string }) {
  return (
    <span className={styles.sample}>
      {n} {unit}
    </span>
  );
}

export function TooltipCard({
  title,
  titleColor,
  meta,
  children,
}: {
  title: ReactNode;
  titleColor?: string;
  meta?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle} style={titleColor ? { color: titleColor } : undefined}>
        {title}
      </div>
      {meta && <div className={styles.tooltipMeta}>{meta}</div>}
      {children}
    </div>
  );
}

export function TooltipRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <dl className={styles.tooltipRow}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </dl>
  );
}

export function Divider({ label }: { label?: string }) {
  return (
    <div className={styles.divider} role="separator">
      <span className={styles.dividerLine} />
      {label ? (
        <>
          <span className={styles.dividerMark} aria-hidden="true" />
          <span className={styles.dividerLabel}>{label}</span>
          <span className={styles.dividerMark} aria-hidden="true" />
        </>
      ) : (
        <span className={styles.dividerMark} aria-hidden="true" />
      )}
      <span className={styles.dividerLine} />
    </div>
  );
}

export function StatBar({
  value,
  max,
  color = 'var(--gold-300)',
  label,
}: {
  value: number;
  max: number;
  color?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={styles.bar}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div className={styles.barFill} style={{ width: `${pct}%`, backgroundColor: color }} />
      {label && <span className={styles.barLabel}>{label}</span>}
    </div>
  );
}
