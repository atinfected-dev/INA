import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Panel } from '../../../../components/ui/frame';
import { Divider } from '../../../../components/ui/bits';
import { WISSEN_STAND, WISSEN_TOPICS, topicBySlug, type Section } from '../../../../lib/forever-wissen';
import {
  FOREVER_BG,
  FOREVER_EDITIONS,
  FOREVER_FEATURES,
  FOREVER_LOGO,
  FOREVER_MARK,
  FOREVER_ZONES,
} from '../../../../lib/forever-art';
import styles from '../../forever.module.css';

/**
 * One knowledge topic, rendered from data.
 *
 * Every topic goes through this template: a painted band with the topic's
 * Blizzard artwork and the Forever logo, then a panel per section. Paragraphs
 * that begin with "!" are the honest gaps — what Blizzard has not said — and
 * are set apart so a reader can tell a fact from an open question at a glance.
 */

type Params = Promise<{ thema: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { thema } = await params;
  return { title: topicBySlug(thema)?.title ?? 'Forever' };
}

const EDITION_CARDS = [
  { key: 'heroic', name: 'Skyborne Heroic Pack', price: '29,99 USD' },
  { key: 'epic', name: 'Skyborne Epic Pack', price: '59,99 USD' },
  { key: 'collection', name: 'Warcraft Forever Collection', price: '79,99 USD · bis 11. Januar 2027' },
] as const;

function SectionBlock({ section, editions }: { section: Section; editions: boolean }) {
  return (
    <Panel
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src={FOREVER_MARK} alt="" width={18} height={20} style={{ width: 18, height: 20 }} />
          {section.title}
        </span>
      }
    >
      {editions && (
        <div className={styles.editions}>
          {EDITION_CARDS.map((edition) => (
            <div key={edition.key} className={styles.edition}>
              <img className={styles.editionArt} src={FOREVER_EDITIONS[edition.key]} alt="" loading="lazy" />
              <h4 className={styles.editionName}>{edition.name}</h4>
              <p className={styles.editionPrice}>{edition.price}</p>
            </div>
          ))}
        </div>
      )}
      {section.paragraphs?.map((text, index) =>
        text.startsWith('!') ? (
          <p key={index} className={styles.open}>
            <strong className={styles.openLabel}>Offen: </strong>
            {text.slice(1)}
          </p>
        ) : (
          <p key={index} className={styles.prose}>
            {text}
          </p>
        ),
      )}
      {section.bullets && (
        <ul className={styles.list}>
          {section.bullets.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
      {section.table && (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.combos} style={{ fontSize: '0.86rem' }}>
            <thead>
              <tr>
                {section.table.columns.map((column) => (
                  <th key={column} style={{ textAlign: 'left' }}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      style={{
                        textAlign: 'left',
                        whiteSpace: 'normal',
                        color: cellIndex === 0 ? 'var(--gold-100)' : 'var(--text-secondary)',
                        verticalAlign: 'top',
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export default async function WissenPage({ params }: { params: Params }) {
  const { thema } = await params;
  const topic = topicBySlug(thema);
  if (!topic) notFound();

  const others = WISSEN_TOPICS.filter((entry) => entry.slug !== topic.slug);

  return (
    <div className={styles.forever}>
      <section className={styles.topicHero} aria-labelledby="topic-title">
        <div className={styles.heroArt} style={{ backgroundImage: `url(${FOREVER_ZONES[topic.heroArt]})` }} />
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
          <p className={styles.topicKicker}>
            {topic.kicker} · Stand {WISSEN_STAND}
          </p>
          <h1 id="topic-title" className={styles.topicTitle}>
            {topic.title}
          </h1>
          <p className={styles.topicIntro}>{topic.intro}</p>
        </div>
      </section>

      <a href="/forever#wissen" className={styles.back}>
        ← Zurück zur Forever-Seite
      </a>

      {topic.sections.map((section) => (
        <SectionBlock
          key={section.title}
          section={section}
          editions={topic.slug === 'roadmap' && section.title === 'Editionen'}
        />
      ))}

      <Divider label="Weiter" />

      <div className={styles.features}>
        {others.map((entry) => (
          <a
            key={entry.slug}
            href={`/forever/wissen/${entry.slug}`}
            className={styles.feature}
            style={{ backgroundImage: `url(${FOREVER_FEATURES[entry.art]})` }}
          >
            <div className={styles.featureWash} />
            <div className={styles.featureBody}>
              <div className={styles.featureKicker}>{entry.kicker}</div>
              <h3 className={styles.featureName}>{entry.title}</h3>
            </div>
          </a>
        ))}
      </div>

      <p className={styles.footnote}>
        Zusammengestellt aus Blizzards Ankündigung und der Berichterstattung zur BlizzCon 2026, in
        eigenen Worten. Bis zum Start kann sich alles noch ändern; was Blizzard nicht gesagt hat,
        steht hier als offen. Grafiken und Logo gehören Blizzard Entertainment und erscheinen im
        Rahmen der Fan-Content-Richtlinie.
      </p>
    </div>
  );
}
