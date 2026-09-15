import type { Metadata } from 'next';
import { BuildList } from '../../../components/forever/build-list';
import { listBuilds } from '../../../lib/forever-builds';
import { FOREVER_BG, FOREVER_LOGO, FOREVER_MARK } from '../../../lib/forever-art';
import { CLASS_DE, CLASS_EN, CLASS_SLUGS, classIcon, loadClassTalents } from '../../../lib/talents';
import { classVar } from '../../../lib/wow';
import styles from '../forever.module.css';
import local from './talente.module.css';

export const metadata: Metadata = {
  title: 'Talentrechner',
  description:
    'Talentrechner für World of Warcraft: Forever — alle neun Klassen, 51 Punkte, Build-Links zum Teilen und die Bestenliste der Gilde.',
};

/**
 * The class picker.
 *
 * Nine tiles, then the builds people have shared. The data behind every tree
 * comes from the BlizzCon footage via the MIT-licensed dataset named in
 * data/talents/SOURCES.md; the page says so, because none of it is official.
 */
export default async function TalentePage() {
  const builds = await listBuilds({ sort: 'score', limit: 8 });
  const total = CLASS_SLUGS.reduce(
    (sum, slug) => sum + loadClassTalents(slug).trees.reduce((n, tree) => n + tree.talents.length, 0),
    0,
  );

  return (
    <div className={styles.forever}>
      <section className={styles.topicHero} aria-labelledby="talente-title">
        <div className={styles.heroArt} style={{ backgroundImage: `url(${FOREVER_BG.countdown})` }} />
        <div className={styles.heroWash} />
        <div className={styles.cloudFront} style={{ backgroundImage: `url(${FOREVER_BG.cloud})` }} />
        <div className={styles.topicInner}>
          <a href="/forever">
            <img className={styles.topicLogo} src={FOREVER_LOGO} alt="World of Warcraft: Forever" width={700} height={570} />
          </a>
          <p className={styles.topicKicker}>Neun Klassen · {total.toLocaleString('de-DE')} Talente · 51 Punkte</p>
          <h1 id="talente-title" className={styles.topicTitle}>
            Talentrechner
          </h1>
          <p className={styles.topicIntro}>
            Punkte verteilen, Build als Link teilen, mit dem Classic-Original vergleichen. Neue und
            geänderte Talente sind markiert; was Blizzard bisher nur im Stream gezeigt hat, sagt der
            Tooltip ehrlich dazu.
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="classes">
        <div className={styles.sectionHead}>
          <h2 id="classes" className={styles.sectionTitle}>
            <img className={styles.mark} src={FOREVER_MARK} alt="" width={26} height={29} />
            Klasse wählen
          </h2>
        </div>
        <div className={local.classes}>
          {CLASS_SLUGS.map((slug) => (
            <a key={slug} href={`/forever/talente/${slug}`} className={local.classTile}>
              <img src={classIcon(slug)} alt="" width={56} height={56} className={local.classIcon} />
              <span className={local.className} style={{ color: classVar(CLASS_EN[slug]) }}>
                {CLASS_DE[slug]}
              </span>
              <span className={local.classEn}>{CLASS_EN[slug]}</span>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="builds">
        <div className={styles.sectionHead}>
          <h2 id="builds" className={styles.sectionTitle}>
            <img className={styles.mark} src={FOREVER_MARK} alt="" width={26} height={29} />
            Beliebte Builds
          </h2>
          <a href="/forever/talente/builds" className={styles.sectionLink}>
            Alle Builds →
          </a>
        </div>
        <BuildList
          builds={builds}
          back="/forever/talente"
          empty="Noch keine Builds. Der erste, der einen veröffentlicht, steht hier oben."
        />
      </section>

      <p className={styles.footnote}>
        Talentdaten aus dem MIT-lizenzierten Datensatz von Deradon (github.com/Deradon/wow-forever-talent-calc),
        gelesen aus dem BlizzCon-2026-Stream, Classic Era 1.15.9 als Vergleich. Nur Rang 1 war zu
        sehen; höhere Ränge sind hochgerechnet. Die Regeln — 51 Punkte, fünf je Reihe, erster
        Punkt auf Stufe 10 — sind die von Classic und für Forever nicht bestätigt. Talentnamen,
        Texte und Icons gehören Blizzard Entertainment.
      </p>
    </div>
  );
}
