import type { Metadata } from 'next';
import { Plaque, PlaqueGrid } from '../../../components/hall-of-fame/plaque';
import { loadManualTitles } from '../../../lib/custom-content';
import { getViewer } from '../../../lib/auth';
import { FOREVER_BG, FOREVER_LOGO, FOREVER_MARK } from '../../../lib/forever-art';
import styles from '../forever.module.css';

export const metadata: Metadata = { title: 'Hall of Fame' };

/**
 * Forever's Hall of Fame.
 *
 * Its own hall, starting empty: the Classic plaques stay where they are, and
 * nothing here is computed from the old logs. Until Forever logs exist, the
 * officers hang titles by hand from the admin panel; once Warcraft Logs
 * carries Forever data, metric titles join them here.
 */
export default async function ForeverHallOfFamePage() {
  const [viewer, holders] = await Promise.all([getViewer(), loadManualTitles('forever')]);

  return (
    <div className={styles.forever}>
      <section className={styles.topicHero} aria-labelledby="hof-title">
        <div className={styles.heroArt} style={{ backgroundImage: `url(${FOREVER_BG.skyborne})` }} />
        <div className={styles.heroWash} />
        <div className={styles.cloudFront} style={{ backgroundImage: `url(${FOREVER_BG.cloud})` }} />
        <div className={styles.topicInner}>
          <a href="/forever">
            <img
              className={styles.topicLogo}
              src={FOREVER_LOGO}
              alt="World of Warcraft: Forever"
              width={700}
              height={570}
            />
          </a>
          <p className={styles.topicKicker}>Die neue Zeit · ab dem ersten Abend</p>
          <h1 id="hof-title" className={styles.topicTitle}>
            Hall of Fame
          </h1>
          <p className={styles.topicIntro}>
            Ehrentafeln für das, was in Forever passiert. Die Tafeln der Gilden-Historie bleiben, wo
            sie sind — hier hängt nur, was nach dem Start geschieht. Kennzahlen kommen dazu, sobald
            die ersten Forever-Logs da sind.
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="plaques">
        <div className={styles.sectionHead}>
          <h2 id="plaques" className={styles.sectionTitle}>
            <img className={styles.mark} src={FOREVER_MARK} alt="" width={26} height={29} />
            Ehrentafeln
          </h2>
          <span className={styles.sectionLink}>
            {holders.length === 0 ? 'noch leer' : `${holders.length.toLocaleString('de-DE')} verliehen`}
            {viewer?.isAdmin && (
              <>
                {' · '}
                <a href="/admin/inhalte#ehrentitel" className={styles.sectionLink}>
                  Titel verleihen →
                </a>
              </>
            )}
          </span>
        </div>

        {holders.length === 0 ? (
          <div className={styles.empty}>
            Noch keine Tafeln. Die erste wird verliehen, sobald es in Forever etwas zu ehren gibt —
            oder sobald ein Offizier eine aufhängt.
          </div>
        ) : (
          <PlaqueGrid>
            {holders.map((holder) => (
              <Plaque key={holder.title.id} holder={holder} />
            ))}
          </PlaqueGrid>
        )}
      </section>

      <p className={styles.footnote}>
        Ranglisten, Rekorde und Erfolge für Forever folgen, wenn Warcraft Logs Forever-Daten
        liefert. Weil Forever-Charaktere Vor- und Nachnamen tragen, braucht die Zuordnung zu
        Personen dann eine neue Abfrage — die entsteht mit den ersten Logs im November.
      </p>
    </div>
  );
}
