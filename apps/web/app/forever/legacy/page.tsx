import type { Metadata } from 'next';
import { LegacyTree } from '../../../components/forever/legacy-tree';
import { FOREVER_BG, FOREVER_FEATURES, FOREVER_LOGO, FOREVER_MARK } from '../../../lib/forever-art';
import { LEGACY_RULES, LEGACY_TREE } from '../../../lib/forever-legacy';
import styles from '../forever.module.css';

export const metadata: Metadata = {
  title: 'Legacy-Baum',
  description:
    'Der Legacy-Baum von World of Warcraft: Forever — kontoweite Punkte, drei Kategorien, 16 Punkte zum Start. Alle gezeigten Knoten, als Planer.',
};

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function LegacyPage({ searchParams }: { searchParams: Search }) {
  const search = await searchParams;
  const code = typeof search.lp === 'string' && /^[0-9]{0,12}(-[0-9]{0,12}){0,2}$/.test(search.lp) ? search.lp : '';
  const known = LEGACY_TREE.reduce((n, c) => n + c.nodes.filter((x) => x.effect).length, 0);
  const all = LEGACY_TREE.reduce((n, c) => n + c.nodes.length, 0);

  return (
    <div className={styles.forever}>
      <section className={styles.topicHero} aria-labelledby="legacy-title">
        <div className={styles.heroArt} style={{ backgroundImage: `url(${FOREVER_FEATURES.journey})` }} />
        <div className={styles.heroWash} />
        <div className={styles.cloudFront} style={{ backgroundImage: `url(${FOREVER_BG.cloud})` }} />
        <div className={styles.topicInner}>
          <a href="/forever">
            <img className={styles.topicLogo} src={FOREVER_LOGO} alt="World of Warcraft: Forever" width={700} height={570} />
          </a>
          <p className={styles.topicKicker}>
            Kontoweit · {LEGACY_RULES.spendableAtLaunch} Punkte zum Start · ~{LEGACY_RULES.earnableApprox} verdienbar
          </p>
          <h1 id="legacy-title" className={styles.topicTitle}>
            Legacy-Baum
          </h1>
          <p className={styles.topicIntro}>
            Forevers zweite Fortschrittsleiste neben den Talenten. Punkte gibt es für Dinge, die man
            ohnehin tut: Stufe 25, 45 und 60 mit einer Klasse, Berufsmeilensteine, Herausforderungen
            beim Leveln und Erkunden. Der Vorrat gehört dem Konto, ausgegeben wird je Charakter — zwei
            Twinks können aus denselben Punkten völlig verschiedene Wege bauen.
          </p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="legacy-how">
        <div className={styles.sectionHead}>
          <h2 id="legacy-how" className={styles.sectionTitle}>
            <img className={styles.mark} src={FOREVER_MARK} alt="" width={26} height={29} />
            So funktioniert es
          </h2>
          <span className={styles.sectionLink}>
            {known} von {all} Knoten bekannt
          </span>
        </div>
        <ul className={styles.list}>
          <li>
            <strong>{LEGACY_RULES.spendableAtLaunch} Punkte</strong> kann ein Charakter zum Start ausgeben, verdienen lassen sich
            ungefähr {LEGACY_RULES.earnableApprox}. Die Lücke ist Absicht: Tiefe in einer Kategorie oder ein dünner
            Streifen über alle drei, nicht beides. Niemand muss jede Herausforderung abhaken, und wer spät anfängt, steht
            nicht vor einer Aufholwand.
          </li>
          <li>
            <strong>Was über der Grenze liegt</strong>, fließt in eine Belohnungsleiste mit Kosmetik und Prestige — bewusst
            getrennt von allem, was Stärke entscheidet.
          </li>
          <li>
            <strong>Drei Kategorien:</strong> Berufe, Abenteuer, Findigkeit. Die starken Knoten sitzen tief.
          </li>
          <li>
            Der Charakter auf der Messe war Stufe {LEGACY_RULES.shownCharacterLevel} und hatte {LEGACY_RULES.shownCharacterPoints}{' '}
            Punkte. Spätere Updates sollen Herausforderungen, Knoten, Zweige oder ganze Bäume ergänzen.
          </li>
        </ul>
        <p className={styles.open}>
          <strong className={styles.openLabel}>Offen: </strong>
          Ob es Voraussetzungen zwischen Knoten gibt, hat Blizzard nicht gezeigt — der Planer kennt daher nur die
          Obergrenze. Sieben Knoten waren auch im Spiel Platzhalter, einer wurde nie angefahren. Alle Zahlen sind
          Rang-1-Werte vom Messestand.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="legacy-plan">
        <div className={styles.sectionHead}>
          <h2 id="legacy-plan" className={styles.sectionTitle}>
            <img className={styles.mark} src={FOREVER_MARK} alt="" width={26} height={29} />
            Punkte verteilen
          </h2>
          <span className={styles.sectionLink}>Linksklick +1 · Rechtsklick −1 · Shift-Klick voll · Link ist der Plan</span>
        </div>
        <LegacyTree initialCode={code} />
      </section>

      <p className={styles.footnote}>
        Knoten, Ränge und Zahlen aus dem BlizzCon-2026-Stream und der Legacy-Präsentation; Beschreibungen in
        eigenen Worten. Bis zum Start kann sich alles ändern. Icons gehören Blizzard Entertainment.
      </p>
    </div>
  );
}
