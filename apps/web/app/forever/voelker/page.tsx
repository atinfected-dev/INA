import type { Metadata } from 'next';
import { FOREVER_RACES, raceById } from '@ina/core';
import { FOREVER_BG, FOREVER_LOGO, FOREVER_MARK } from '../../../lib/forever-art';
import { FOREVER_RACIALS, RACIAL_STATUS, type RacialTrait } from '../../../lib/forever-races';
import { talentIconUrl } from '../../../lib/talents';
import { raceIconUrl } from '../../../lib/zone-art';
import { classIconUrl } from '../../../lib/wow';
import styles from '../forever.module.css';

export const metadata: Metadata = {
  title: 'Völker & Volksfähigkeiten',
  description:
    'Alle neun Völker von World of Warcraft: Forever mit ihren Volksfähigkeiten, verglichen mit Classic — zwei aktive, zwei passive, und was wegfällt.',
};

const CLASS_DE: Record<string, string> = {
  Warrior: 'Krieger',
  Paladin: 'Paladin',
  Hunter: 'Jäger',
  Rogue: 'Schurke',
  Priest: 'Priester',
  Shaman: 'Schamane',
  Mage: 'Magier',
  Warlock: 'Hexenmeister',
  Druid: 'Druide',
};

const FLAG_CLASS: Record<RacialTrait['status'], string> = {
  new: styles.flagNew ?? '',
  changed: styles.flagChanged ?? '',
  same: styles.flagSame ?? '',
  removed: styles.flagRemoved ?? '',
};

function Trait({ trait }: { trait: RacialTrait }) {
  const status = RACIAL_STATUS[trait.status];
  return (
    <li className={`${styles.trait} ${trait.status === 'removed' ? styles.traitRemoved : ''}`}>
      <img className={styles.traitIcon} src={talentIconUrl(trait.icon)} alt="" width={40} height={40} loading="lazy" />
      <div>
        <div className={styles.traitName}>
          <i className={`${styles.traitFlag} ${FLAG_CLASS[trait.status]}`} title={status.label}>
            {status.mark}
          </i>
          {trait.name}
          <span className={styles.traitKind}>
            {trait.kind === 'active' ? 'Aktiv' : 'Passiv'}
            {trait.variant === 'alliance' ? ' · nur Allianz' : trait.variant === 'horde' ? ' · nur Horde' : ''}
          </span>
        </div>
        <p className={styles.traitEffect}>{trait.effect}</p>
        {trait.classic && (
          <p className={styles.traitClassic}>
            <strong>Classic:</strong> {trait.classic}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * The nine peoples and what their blood grants.
 *
 * Class lists come from the same table the character planner uses (@ina/core);
 * traits from lib/forever-races. Removed Classic racials stay visible, greyed,
 * because "what did I lose" is half of what a returning player asks.
 */
export default function VoelkerPage() {
  const byFaction = (faction: 'alliance' | 'horde' | 'neutral') => FOREVER_RACIALS.filter((r) => r.faction === faction);
  const total = FOREVER_RACIALS.reduce((n, r) => n + r.traits.length, 0);

  return (
    <div className={styles.forever}>
      <section className={styles.topicHero} aria-labelledby="races-title">
        <div className={styles.heroArt} style={{ backgroundImage: `url(${FOREVER_BG.skyborne})` }} />
        <div className={styles.heroWash} />
        <div className={styles.cloudFront} style={{ backgroundImage: `url(${FOREVER_BG.cloud})` }} />
        <div className={styles.topicInner}>
          <a href="/forever">
            <img className={styles.topicLogo} src={FOREVER_LOGO} alt="World of Warcraft: Forever" width={700} height={570} />
          </a>
          <p className={styles.topicKicker}>Neun Völker · {total} Volksfähigkeiten · Stand BlizzCon 2026</p>
          <h1 id="races-title" className={styles.topicTitle}>
            Völker &amp; Volksfähigkeiten
          </h1>
          <p className={styles.topicIntro}>
            Jedes Volk bekommt zwei aktive und zwei passive Fähigkeiten, ähnlich stark, aber anders
            verteilt auf Angriff, Verteidigung und Nutzen. Die Widerstands-Boni sind weg, Waffen-
            Spezialisierungen geben kritische Trefferchance statt Waffenfertigkeit, und mehrere Völker
            haben ganz neue Fähigkeiten. Werte wie auf Stufe 60 gezeigt.
          </p>
        </div>
      </section>

      <div className={styles.legend} style={{ marginTop: '1rem' }}>
        {(Object.keys(RACIAL_STATUS) as RacialTrait['status'][]).map((key) => (
          <span key={key}>
            <i className={`${styles.traitFlag} ${FLAG_CLASS[key]}`}>{RACIAL_STATUS[key].mark}</i> {RACIAL_STATUS[key].label}
          </span>
        ))}
      </div>

      {(['alliance', 'horde', 'neutral'] as const).map((faction) => (
        <section key={faction} className={styles.section} aria-labelledby={`f-${faction}`}>
          <div className={styles.sectionHead}>
            <h2 id={`f-${faction}`} className={styles.sectionTitle}>
              <img className={styles.mark} src={FOREVER_MARK} alt="" width={26} height={29} />
              {faction === 'alliance' ? 'Allianz' : faction === 'horde' ? 'Horde' : 'Skyborne — beide Seiten'}
            </h2>
            {faction === 'neutral' && (
              <span className={styles.sectionLink}>Allianz-Skyborne dazu Magier · Horde-Skyborne dazu Schamane</span>
            )}
          </div>
          <div className={styles.races}>
            {byFaction(faction).map((race) => {
              const core = raceById(race.id) ?? FOREVER_RACES.find((r) => r.id === race.id);
              const classes = core
                ? [...core.classes, ...(core.byFaction?.alliance ?? []), ...(core.byFaction?.horde ?? [])]
                : [];
              const headClass =
                faction === 'alliance' ? styles.raceHeadAlliance : faction === 'horde' ? styles.raceHeadHorde : styles.raceHeadNeutral;
              return (
                <article key={race.id} className={styles.race}>
                  <header className={headClass}>
                    {core?.icon ? (
                      <img className={styles.raceIcon} src={raceIconUrl(core.icon)} alt="" width={48} height={48} style={{ width: 48, height: 48 }} />
                    ) : (
                      <img className={styles.raceIcon} src="/talent-icons/crop-wind-blessed.png" alt="" width={48} height={48} style={{ width: 48, height: 48 }} />
                    )}
                    <div>
                      <h3 className={styles.raceName}>{race.name}</h3>
                      <p className={styles.raceBlurb}>{race.blurb}</p>
                    </div>
                  </header>
                  <div className={styles.raceClasses}>
                    {classes.map((cls) => {
                      const isNew = core?.newClasses.includes(cls);
                      const only = core?.byFaction?.alliance?.includes(cls) ? ' (A)' : core?.byFaction?.horde?.includes(cls) ? ' (H)' : '';
                      return (
                        <span key={cls} className={isNew ? styles.raceClassNew : styles.raceClass} title={isNew ? 'Neu in Forever' : undefined}>
                          <img src={classIconUrl(cls)} alt="" width={16} height={16} />
                          {CLASS_DE[cls] ?? cls}
                          {only}
                          {isNew ? ' ★' : ''}
                        </span>
                      );
                    })}
                  </div>
                  <ul className={styles.traits}>
                    {race.traits.map((trait) => (
                      <Trait key={trait.id} trait={trait} />
                    ))}
                    {race.removed.map((trait) => (
                      <Trait key={trait.id} trait={trait} />
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <p className={styles.footnote}>
        Aus dem BlizzCon-2026-Stream gelesen (Datensatz Deradon/wow-forever-talent-calc, MIT) und
        gegen die dort gezeigten Stufe-60-Tooltips geprüft; Beschreibungen in eigenen Worten. Bis zum
        Start kann sich alles ändern. Icons und Namen gehören Blizzard Entertainment; die Skyborne-
        Icons sind Ausschnitte aus dem Stream, weil Blizzard sie noch nicht veröffentlicht hat.
      </p>
    </div>
  );
}
