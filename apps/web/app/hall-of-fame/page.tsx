import type { Metadata } from 'next';
import { OrnateFrame } from '../../components/ui/frame';
import { PAGE_ART, zoneArt } from '../../lib/zone-art';
import { Divider } from '../../components/ui/bits';
import { loadSettings } from '../../lib/settings';
import { loadHallOfFame, type HallOfFameHolder } from '../../lib/hall-of-fame';
import { classVar, formatAmount, formatNumber } from '../../lib/wow';
import styles from './hall.module.css';

export const metadata: Metadata = { title: 'Hall of Fame' };
export const revalidate = 900;

function formatValue(holder: HallOfFameHolder): string {
  if (holder.value === null) return '—';
  if (holder.unit === 'amount') return formatAmount(holder.value);
  if (holder.unit === 'percentile') return formatNumber(holder.value, 1);
  if (holder.unit === 'percent') return `${formatNumber(holder.value, 1)} %`;
  return formatNumber(holder.value);
}

function Plaque({ holder }: { holder: HallOfFameHolder }) {
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
      <div className={styles.value}>{formatValue(holder)}</div>
    </article>
  );
}

export default async function HallOfFamePage() {
  const settings = await loadSettings();
  const holders = await loadHallOfFame(settings.hallOfFameTitles);

  const awarded = holders.filter((h) => !h.unavailable);
  const pending = holders.filter((h) => h.unavailable);

  return (
    <>
      <OrnateFrame
        art={PAGE_ART.hallOfFame}
        title="Hall of Fame"
        subtitle="Ehrentafeln über die gesamte Gildenhistorie"
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '66ch' }}>
          Die Titel sind Einstellungssache, kein fester Code: welcher Titel wofür vergeben wird,
          steht in den Einstellungen und lässt sich ändern, ohne die Anwendung neu auszurollen.
        </p>
      </OrnateFrame>

      <Divider label="Ehrentafeln" />

      <div className={styles.grid}>
        {awarded.map((holder) => (
          <Plaque key={holder.title.id} holder={holder} />
        ))}
      </div>

      {pending.length > 0 && (
        <>
          <Divider label="Noch nicht vergeben" />
          <div className={styles.grid}>
            {pending.map((holder) => (
              <Plaque key={holder.title.id} holder={holder} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
