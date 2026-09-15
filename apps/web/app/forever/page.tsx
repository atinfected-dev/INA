import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  CLASS_LABELS,
  FACTION_LABELS,
  FOREVER_CLASSES,
  FOREVER_DATES,
  FOREVER_RACES,
  daysUntilRelease,
  raceById,
  type Faction,
} from '@ina/core';
import { Panel } from '../../components/ui/frame';
import { Divider } from '../../components/ui/bits';
import { CharacterForm } from '../../components/forever/character-form';
import { getViewer } from '../../lib/auth';
import {
  POST_KINDS,
  loadForeverPosts,
  loadForeverProgress,
  loadForeverRoster,
  loadMyForeverCharacter,
  type PostKind,
} from '../../lib/forever';
import { FOREVER_ART, artUrl, raceIconUrl } from '../../lib/zone-art';
import { WISSEN_TOPICS } from '../../lib/forever-wissen';
import { classVar, formatNumber } from '../../lib/wow';
import { deleteForeverCharacterAction, saveForeverCharacterAction } from './actions';
import landing from '../landing.module.css';
import styles from './forever.module.css';
import forms from '../../components/auth/form.module.css';

export const metadata: Metadata = { title: 'Forever' };

type Search = Promise<Record<string, string | string[] | undefined>>;

const de = (n: number): string => n.toLocaleString('de-DE');
const KINDS: PostKind[] = ['info', 'guide', 'sheet'];

/** The Skyborne have no icon on Blizzard's CDN yet: a drawn wind glyph stands in. */
function SkyborneIcon() {
  return (
    <svg className={styles.raceIcon} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" fill="#0a1512" />
      <g fill="none" stroke="#8fe0bd" strokeWidth="2" strokeLinecap="round">
        <path d="M6 22c6-8 14-8 18-2 3 4-1 8-5 6" />
        <path d="M10 30c6-5 12-4 16 0" />
        <path d="M14 12c5-3 10-2 13 2" />
      </g>
    </svg>
  );
}

export default async function ForeverPage({ searchParams }: { searchParams: Search }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/anmelden');

  const search = await searchParams;
  const ok = typeof search.ok === 'string' ? search.ok : null;
  const error = typeof search.fehler === 'string' ? search.fehler : null;

  const [posts, roster, mine, progress] = await Promise.all([
    loadForeverPosts(),
    loadForeverRoster(),
    loadMyForeverCharacter(viewer.id),
    loadForeverProgress(),
  ]);

  const days = daysUntilRelease(new Date());
  const release = new Date(`${FOREVER_DATES.release}T00:00:00`).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const byFaction = (faction: Faction) => roster.filter((row) => row.faction === faction);
  const roleCount = (faction: Faction) => {
    const rows = byFaction(faction);
    const count = (role: string) => rows.filter((row) => row.role === role).length;
    return `${count('Tank')} Tank · ${count('Heiler')} Heiler · ${count('Schaden')} Schaden`;
  };

  return (
    <>
      <section className={landing.hero} aria-labelledby="forever-title">
        <div className={landing.heroArt} style={{ backgroundImage: `url(${FOREVER_ART.hero})` }} />
        <div className={landing.heroWash} />
        <div className={landing.mistBack} />
        <div className={landing.mistFront} />
        <div className={landing.heroInner}>
          <p className={landing.kicker}>World of Warcraft: Forever · {release}</p>
          <h1 id="forever-title" className={landing.title}>
            Is Not Alone kehrt zurück
          </h1>
          <p className={landing.tagline}>
            Azeroth, wie es 2004 war — und weiter, als es je war. Level 60, neue Gebiete, neue
            Schlachtzüge, ein neues Volk. Hier planen wir, wer was spielt, sammeln Guides und
            Raidsheets, und ab dem ersten Abend zählen neue Erfolge — die alte Geschichte bleibt,
            wie sie ist.
          </p>
          {days > 0 ? (
            <div className={styles.countdown}>
              <span className={styles.countdownNumber}>{de(days)}</span>
              <span className={styles.countdownLabel}>{days === 1 ? 'Tag' : 'Tage'} bis zum Start</span>
            </div>
          ) : (
            <div className={styles.countdown}>
              <span className={styles.countdownLabel}>Forever ist live</span>
            </div>
          )}
          <div className={landing.ctaRow}>
            <a href="#mein-charakter" className={landing.ctaJade}>
              {mine ? 'Mein Charakter' : 'Charakter eintragen'}
            </a>
            <a href="#guides" className={landing.cta}>
              Guides
            </a>
            <a href="#aufstellung" className={landing.cta}>
              Aufstellung
            </a>
          </div>
        </div>
      </section>

      {ok && <p className={forms.notice}>{ok}</p>}
      {error && <p className={forms.error}>{error}</p>}

      {/* --- Posts ------------------------------------------------------------- */}
      <section className={landing.section} id="guides" aria-labelledby="posts">
        <div className={landing.sectionHead}>
          <h2 id="posts" className={landing.sectionTitle}>
            Infos, Guides, Raidsheets
          </h2>
          {viewer.isAdmin && (
            <a href="/admin/inhalte#forever" className={landing.sectionLink}>
              Beitrag anlegen →
            </a>
          )}
        </div>
        <div className={styles.columns}>
          {KINDS.map((kind) => {
            const entries = posts.filter((post) => post.kind === kind);
            return (
              <div key={kind} className={styles.column}>
                <div className={styles.columnHead}>
                  <h3 className={styles.columnTitle}>{POST_KINDS[kind].plural}</h3>
                  <span className={styles.columnHint}>{POST_KINDS[kind].description}</span>
                </div>
                {entries.length === 0 ? (
                  <div className={styles.empty}>Noch nichts — kommt, sobald die Offiziere etwas einstellen.</div>
                ) : (
                  entries.map((post) => (
                    <article key={post.id} className={post.pinned ? styles.postPinned : styles.post}>
                      <h4 className={styles.postTitle}>{post.title}</h4>
                      <p className={styles.postMeta}>
                        {post.pinned ? 'Angepinnt · ' : ''}
                        {post.createdAt.toLocaleDateString('de-DE')}
                      </p>
                      {post.body && <p className={styles.postBody}>{post.body}</p>}
                      {post.url && (
                        <a className={styles.postLink} href={post.url} target="_blank" rel="noopener">
                          Öffnen →
                        </a>
                      )}
                    </article>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* --- Knowledge -------------------------------------------------------- */}
      <section className={landing.section} id="wissen" aria-labelledby="wissen-title">
        <div className={landing.sectionHead}>
          <h2 id="wissen-title" className={landing.sectionTitle}>
            Alles über Forever
          </h2>
          <span className={landing.sectionLink}>Stand der Ankündigung · auf Deutsch</span>
        </div>
        <div className={landing.tiles}>
          {WISSEN_TOPICS.map((topic) => (
            <a key={topic.slug} href={`/forever/wissen/${topic.slug}`} className={landing.tile}>
              <div className={landing.tileArt} style={{ backgroundImage: `url(${artUrl(topic.art, 'small')})` }} />
              <div className={landing.tileWash} />
              <div className={landing.tileBody}>
                <div className={landing.tileKicker}>{topic.kicker}</div>
                <h3 className={landing.tileName}>{topic.title}</h3>
                <div className={landing.tileFacts}>{topic.teaser}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* --- Roster ----------------------------------------------------------- */}
      <section className={landing.section} id="aufstellung" aria-labelledby="roster">
        <div className={landing.sectionHead}>
          <h2 id="roster" className={landing.sectionTitle}>
            Wer spielt was
          </h2>
          <span className={landing.sectionLink}>{de(roster.length)} eingetragen</span>
        </div>
        <div className={styles.factions}>
          {(['alliance', 'horde'] as const).map((faction) => {
            const rows = byFaction(faction);
            return (
              <div key={faction} className={styles.faction}>
                <div className={faction === 'alliance' ? styles.factionAlliance : styles.factionHorde}>
                  <span>
                    {FACTION_LABELS[faction]} · {de(rows.length)}
                  </span>
                  <span className={styles.roles}>{roleCount(faction)}</span>
                </div>
                {rows.length === 0 ? (
                  <div className={styles.empty} style={{ margin: '0.7rem' }}>
                    Noch niemand.
                  </div>
                ) : (
                  <ul className={styles.rosterList}>
                    {rows.map((row) => {
                      const race = raceById(row.race);
                      return (
                        <li key={row.id} className={styles.rosterRow}>
                          {race?.icon ? (
                            <img
                              className={styles.raceIcon}
                              src={raceIconUrl(race.icon)}
                              alt={race.name}
                              width={40}
                              height={40}
                              loading="lazy"
                            />
                          ) : (
                            <SkyborneIcon />
                          )}
                          <div>
                            <div className={styles.rosterName} style={{ color: classVar(row.className) }}>
                              {row.name}
                            </div>
                            <div className={styles.rosterMeta}>
                              {race?.name ?? row.race} · {CLASS_LABELS[row.className]} ·{' '}
                              <span style={{ color: 'var(--text-muted)' }}>{row.member.displayName}</span>
                              {row.note && <span className={styles.rosterNote}>{row.note}</span>}
                            </div>
                          </div>
                          <span className={styles.rosterRole}>{row.role}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* --- My character ------------------------------------------------------ */}
      <Divider label="Mein Charakter" />

      <Panel
        title={mine ? `${mine.name} — ${CLASS_LABELS[mine.className]}` : 'Wen spielst du in Forever?'}
        subtitle={
          mine
            ? `Zuletzt geändert ${mine.updatedAt.toLocaleDateString('de-DE')}`
            : 'Ein Eintrag pro Konto. Er zählt, sobald der Charakter das erste Mal im Log steht.'
        }
      >
        <CharacterForm
          action={saveForeverCharacterAction}
          initial={{
            name: mine?.name ?? '',
            race: mine?.race ?? 'human',
            className: mine?.className ?? '',
            faction: mine?.faction ?? '',
            role: mine?.role ?? '',
            note: mine?.note ?? '',
          }}
        />
        {mine && (
          <form action={deleteForeverCharacterAction} style={{ marginTop: '0.8rem' }}>
            <button type="submit" className={forms.smallDanger}>
              Eintrag entfernen
            </button>
          </form>
        )}
      </Panel>

      {/* --- Race/class table ------------------------------------------------- */}
      <Divider label="Völker und Klassen" />

      <Panel
        title="Wer kann was"
        subtitle="Stand der Ankündigung — kann sich bis zum Start noch ändern"
        flush
      >
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.combos}>
            <thead>
              <tr>
                <th>Volk</th>
                {FOREVER_CLASSES.map((cls) => (
                  <th key={cls}>{CLASS_LABELS[cls]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FOREVER_RACES.map((race) => {
                const all = [
                  ...race.classes,
                  ...(race.byFaction?.alliance ?? []),
                  ...(race.byFaction?.horde ?? []),
                ];
                return (
                  <tr key={race.id}>
                    <td>
                      {race.name}
                      <span style={{ color: 'var(--text-muted)' }}>
                        {' '}
                        · {race.faction === 'neutral' ? 'beide' : FACTION_LABELS[race.faction]}
                        {race.isNewRace ? ' · neu' : ''}
                      </span>
                    </td>
                    {FOREVER_CLASSES.map((cls) => {
                      const can = all.includes(cls);
                      const isNew = race.newClasses.includes(cls);
                      const factionOnly =
                        race.byFaction?.alliance?.includes(cls)
                          ? ' (A)'
                          : race.byFaction?.horde?.includes(cls)
                            ? ' (H)'
                            : '';
                      return (
                        <td key={cls} className={can ? (isNew ? styles.new : styles.yes) : styles.no}>
                          {can ? `✓${factionOnly}` : '·'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ margin: 0, padding: '0.6rem 0.9rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span className={styles.new}>Grün</span> sind Paarungen, die es im Original nicht gab. (A)/(H):
          nur auf dieser Seite der Skyborne.
        </p>
      </Panel>

      {/* --- Raids ---------------------------------------------------------------- */}
      <section className={landing.section} aria-labelledby="raids">
        <div className={landing.sectionHead}>
          <h2 id="raids" className={landing.sectionTitle}>
            Die Schlachtzüge
          </h2>
          <span className={landing.sectionLink}>dazu zwei neue, die Blizzard noch nicht benannt hat</span>
        </div>
        <div className={landing.tiles}>
          {FOREVER_ART.raids.map((raid) => (
            <div key={raid.slug} className={landing.tile}>
              <div className={landing.tileArt} style={{ backgroundImage: `url(${raid.url})` }} />
              <div className={landing.tileWash} />
              <div className={landing.tileBody}>
                <div className={landing.tileKicker}>Forever</div>
                <h3 className={landing.tileName}>{raid.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Achievements era ----------------------------------------------------- */}
      <section className={landing.honoursBand} aria-labelledby="era">
        <div className={landing.honoursArt} style={{ backgroundImage: `url(${FOREVER_ART.band})` }} />
        <div className={landing.honoursWash} />
        <div className={landing.bandInner}>
          <div className={landing.sectionHead}>
            <h2 id="era" className={landing.sectionTitle}>
              Forever-Erfolge
            </h2>
            <span className={landing.sectionLink}>beginnen bei null</span>
          </div>
          <div className={styles.era}>
            <div>
              <div className={landing.counterValue}>{de(progress.nights)}</div>
              <div className={landing.counterLabel}>Raidabende</div>
            </div>
            <div>
              <div className={landing.counterValue}>{de(progress.pulls)}</div>
              <div className={landing.counterLabel}>Pulls</div>
            </div>
            <div>
              <div className={landing.counterValue}>{de(progress.kills)}</div>
              <div className={landing.counterLabel}>Bosskills</div>
            </div>
          </div>
          <p style={{ maxWidth: '68ch', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Was ihr in Forever erreicht, wird hier von vorn gezählt — Erfolge, Rekorde, Hall of
            Fame für die neue Zeit. Die {formatNumber(582)} Abende seit Wrath bleiben unangetastet,
            so wie sie sind; Forever bekommt seine eigene Geschichte daneben.{' '}
            {progress.known
              ? 'Die ersten Logs sind da.'
              : `Der Zähler startet mit dem ersten Log nach dem ${release}.`}
          </p>
        </div>
      </section>
    </>
  );
}
