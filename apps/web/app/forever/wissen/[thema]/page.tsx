import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { OrnateFrame, Panel } from '../../../../components/ui/frame';
import { Divider } from '../../../../components/ui/bits';
import { getViewer } from '../../../../lib/auth';
import { WISSEN_STAND, WISSEN_TOPICS, topicBySlug, type Section } from '../../../../lib/forever-wissen';
import { artUrl } from '../../../../lib/zone-art';
import styles from '../../forever.module.css';
import landing from '../../../landing.module.css';

/**
 * One knowledge topic, rendered from data.
 *
 * Every topic goes through this template: an ornate frame with the topic's
 * painting, then a panel per section. Paragraphs that begin with "!" are
 * the honest gaps — what Blizzard has not said — and are set apart so a
 * reader can tell a fact from an open question at a glance.
 */

type Params = Promise<{ thema: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { thema } = await params;
  return { title: topicBySlug(thema)?.title ?? 'Forever' };
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <Panel title={section.title}>
      {section.paragraphs?.map((text, index) =>
        text.startsWith('!') ? (
          <p
            key={index}
            style={{
              margin: '0 0 0.8rem',
              padding: '0.6rem 0.8rem',
              borderLeft: '2px solid var(--jade-500)',
              color: 'var(--text-secondary)',
              background: 'rgb(58 168 130 / 6%)',
              maxWidth: '72ch',
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: 'var(--jade-200)' }}>Offen: </strong>
            {text.slice(1)}
          </p>
        ) : (
          <p
            key={index}
            style={{ margin: '0 0 0.8rem', color: 'var(--text-secondary)', maxWidth: '72ch', lineHeight: 1.6 }}
          >
            {text}
          </p>
        ),
      )}
      {section.bullets && (
        <ul style={{ margin: '0 0 0.8rem', paddingLeft: '1.2rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '72ch' }}>
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
                        color: cellIndex === 0 ? 'var(--gold-200)' : 'var(--text-secondary)',
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
  const viewer = await getViewer();
  if (!viewer) redirect('/anmelden');

  const { thema } = await params;
  const topic = topicBySlug(thema);
  if (!topic) notFound();

  const others = WISSEN_TOPICS.filter((entry) => entry.slug !== topic.slug);

  return (
    <>
      <OrnateFrame
        art={artUrl(topic.art)}
        title={topic.title}
        subtitle={`${topic.kicker} · Stand ${WISSEN_STAND}`}
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '70ch', lineHeight: 1.6 }}>
          {topic.intro}
        </p>
      </OrnateFrame>

      <p style={{ margin: '0.8rem 0 0', fontSize: '0.85rem' }}>
        <a href="/forever#wissen">← Forever</a>
      </p>

      {topic.sections.map((section) => (
        <SectionBlock key={section.title} section={section} />
      ))}

      <Divider label="Weiter" />

      <div className={landing.tiles}>
        {others.map((entry) => (
          <a key={entry.slug} href={`/forever/wissen/${entry.slug}`} className={landing.tile}>
            <div className={landing.tileArt} style={{ backgroundImage: `url(${artUrl(entry.art, 'small')})` }} />
            <div className={landing.tileWash} />
            <div className={landing.tileBody}>
              <div className={landing.tileKicker}>{entry.kicker}</div>
              <h3 className={landing.tileName}>{entry.title}</h3>
            </div>
          </a>
        ))}
      </div>

      <p style={{ margin: '1.5rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '72ch' }}>
        Zusammengestellt aus Blizzards Ankündigung und der Berichterstattung zur BlizzCon 2026, in
        eigenen Worten. Bis zum Start kann sich alles noch ändern; was Blizzard nicht gesagt hat,
        steht hier als offen.
      </p>
    </>
  );
}
