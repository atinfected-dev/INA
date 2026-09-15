import type { HallOfFameHolder } from '../../lib/hall-of-fame';
import { classVar, formatAmount, formatNumber } from '../../lib/wow';
import styles from './hall.module.css';

/**
 * One Hall of Fame plaque, shared by the Classic hall and the Forever hall.
 *
 * Colours come from the page's tokens, so the same plaque wears gold on
 * jade in the history and gold on night-blue under Forever.
 */

function formatValue(holder: HallOfFameHolder): string {
  if (holder.value === null) return '—';
  if (holder.unit === 'amount') return formatAmount(holder.value);
  if (holder.unit === 'percentile') return formatNumber(holder.value, 1);
  if (holder.unit === 'percent') return `${formatNumber(holder.value, 1)} %`;
  return formatNumber(holder.value);
}

export function Plaque({ holder }: { holder: HallOfFameHolder }) {
  if (holder.unavailable) {
    return (
      <div className={styles.pending}>
        <div className={styles.pendingTitle}>{holder.title.title}</div>
        <div className={styles.pendingText}>{holder.unavailable}</div>
      </div>
    );
  }

  return (
    <article className={styles.plaque}>
      <span className={styles.cornerTL} aria-hidden="true" />
      <span className={styles.cornerTR} aria-hidden="true" />
      <span className={styles.cornerBL} aria-hidden="true" />
      <span className={styles.cornerBR} aria-hidden="true" />

      <h2 className={styles.title}>{holder.title.title}</h2>
      <p className={styles.subtitle}>{holder.title.subtitle}</p>

      {holder.tiedWith.length > 1 ? (
        // An honest tie beats an arbitrary winner: with several holders on the
        // same number, sort order would decide who gets the title.
        <>
          <div className={styles.tieHeading}>{holder.tiedWith.length} gleichauf</div>
          <div className={styles.tieList}>
            {holder.tiedWith.slice(0, 6).map((tied) => (
              <span key={tied.name} style={{ color: classVar(tied.className) }}>
                {tied.name}
              </span>
            ))}
            {holder.tiedWith.length > 6 && (
              <span className={styles.tieMore}>und {holder.tiedWith.length - 6} weitere</span>
            )}
          </div>
        </>
      ) : (
        <div className={styles.holder} style={{ color: classVar(holder.className) }}>
          {holder.name ?? 'niemand'}
        </div>
      )}
      <div className={styles.value}>{holder.note ?? formatValue(holder)}</div>
    </article>
  );
}

export function PlaqueGrid({ children }: { children: React.ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}
