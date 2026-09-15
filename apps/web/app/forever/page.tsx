import type { Metadata } from 'next';
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
import { FOREVER_BG, FOREVER_FEATURES, FOREVER_LOGO, FOREVER_MARK, FOREVER_ZONES } from '../../lib/forever-art';
import { WISSEN_TOPICS } from '../../lib/forever-wissen';
import { FOREVER_ART, raceIconUrl } from '../../lib/zone-art';
import { classVar, formatNumber } from '../../lib/wow';
import { deleteForeverCharacterAction, saveForeverCharacterAction } from './actions';
import styles from './forever.module.css';
import forms from '../../components/auth/form.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Is Not Alone — World of Warcraft: Forever' },
};

type Search = Promise<Record<string, string | string[] | undefined>>;

const de = (n: number): string => n.toLocaleString('de-DE');
const KINDS: PostKind[] = ['info', 'guide', 'sheet'];

/** The Skyborne have no icon on Blizzard's CDN yet: a drawn wind glyph stands in. */
function SkyborneIcon() {
  return (
    <svg className={styles.raceIcon} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" fill="#061622" />
      <g fill="none" stroke="#9bd7ff" strokeWidth="2" strokeLinecap="round">
        <path d="M6 22c6-8 14-8 18-2 3 4-1 8-5 6" />
        <path d="M10 30c6-5 12-4 16 0" />
        <path d="M14 12c5-3 10-2 13 2" />
      </g>
    </svg>
  );
}

/** Section heading with the Forever compass mark. */
function Head({ id, title, aside }: { id: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <h2 id={id} className={styles.sectionTitle}>
        <img className={styles.mark} src={FOREVER_MARK} alt="" width={26} height={29} />
        {title}
      </h2>
      {aside && <span className={styles.sectionLink}>{aside}</span>}
    </div>
  );
}

export default async function ForeverPage({ searchParams }: { searchParams: Search }) {
  // Public: the roster, the guides and the knowledge base are for everyone.
  // Only a member's own character needs an account.
  const viewer = await getViewer();

  const search = await searchParams;
  const ok = typeof search.ok === 'string' ? search.ok : null;
  const error = typeof search.fehler === 'string' ? search.fehler : null;

  const [posts, roster, mine, progress] = await Promise.all([
    loadForeverPosts(),
    loadForeverRoster(),
    viewer ? loadMyForeverCharacter(viewer.id) : Promise.resolve(null),
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
    <div className={styles.forever}>
      {/* --- Hero ----------------------------------------------------------- */}
      <section className={styles.hero} aria-labelledby="forever-title">
        <div className={styles.heroArt} style={{ backgroundImage: `url(${FOREVER_BG.masthead})` }} />
        <div className={styles.heroWash} />
        <div className={styles.cloudBack} style={{ backgroundImage: `url(${FOREVER_BG.cloud})` }} />
        <div className={styles.cloudFront} style={{ backgroundImage: `url(${FOREVER_BG.cloud})` }} />
        <div className={styles.heroInner}>
          <img
            className={styles.logo}
            src={FOREVER_LOGO}
            alt="World of Warcraft: Forever"
            width={700}
            height={570}
            fetchPriority="high"
          />
          <p className={styles.kicker}>Is Not Alone · Everlook EU</p>
          <h1 id="forever-title" className={styles.title}>
            Wir kehren zurück
          </h1>
          <p className={styles.tagline}>
            Azeroth, wie es 2004 war — und weiter, als es je war. Stufe 60, neue Gebiete, neue
            Schlachtzüge, ein neues Volk. Hier planen wir, wer was spielt, sammeln Guides und
            Raidsheets, und ab dem ersten Abend zählen neue Erfolge. Die alte Geschichte bleibt,
            wie sie ist.
          </p>
          <div className={styles.ctaRow}>
            <a href={viewer ? '#mein-charakter' : '/anmelden'} className={styles.ctaGold}>
              {mine ? 'Mein Charakter' : viewer ? 'Charakter eintragen' : 'Anmelden & Charakter eintragen'}
            </a>
            <a href="/forever/talente" className={styles.cta}>
              Talentrechner
            </a>
            <a href="#wissen" className={styles.cta}>
              Alles über Forever
            </a>
          </div>
          <p className={styles.disclaimer}>
            Fanseite der Gilde Is Not Alone. World of Warcraft, Forever, Logo und Grafiken gehören
            Blizzard Entertainment und erscheinen hier im Rahmen der Fan-Content-Richtlinie. Keine
            offizielle Seite.
          </p>
        </div>
      </section>

      {/* --- Countdown -------------------------------------------------------- */}
      <div className={styles.countdown} style={{ backgroundImage: `url(${FOREVER_BG.countdown})` }}>
        {days > 0 ? (
          <>
            <span className={styles.countdownNumber}>{de(days)}</span>
            <span className={styles.countdownLabel}>{days === 1 ? 'Tag' : 'Tage'} bis zum Start</span>
          </>
        ) : (
          <span className={styles.countdownLabel}>Forever ist live</span>
        )}
        <span className={styles.countdownDate}>Weltweiter Start am {release}</span>
      </div>

      {ok && (
        <p className={forms.notice} style={{ marginTop: '1.5rem' }}>
          {ok}
        </p>
      )}
      {error && (
        <p className={forms.error} style={{ marginTop: '1.5rem' }}>
          {error}
        </p>
      )}

      {/* --- Posts ------------------------------------------------------------- */}
      <section className={styles.section} id="guides" aria-labelledby="posts">
        <Head
          id="posts"
          title="Infos, Guides, Raidsheets"
          aside={
            viewer?.isAdmin ? (
              <a href="/admin/inhalte#forever" className={styles.sectionLink}>
                Beitrag anlegen →
              </a>
            ) : undefined
          }
        />
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

      {/* --- Tools ---------------------------------------------------------------- */}
      <section className={styles.section} id="werkzeuge" aria-labelledby="tools">
        <Head id="tools" title="Planen" aside="Talente, Völker, Legacy" />
        <div className={styles.features}>
          <a href="/forever/talente" className={styles.feature} style={{ backgroundImage: `url(${FOREVER_FEATURES.power})` }}>
            <div className={styles.featureWash} />
            <div className={styles.featureBody}>
              <div className={styles.featureKicker}>Talentrechner</div>
              <h3 className={styles.featureName}>Alle neun Klassen</h3>
              <div className={styles.featureTeaser}>51 Punkte, Build-Links, Vergleich mit Classic, Bestenliste.</div>
            </div>
          </a>
          <a href="/forever/voelker" className={styles.feature} style={{ backgroundImage: 'url(/forever/zone-zephras.webp)' }}>
            <div className={styles.featureWash} />
            <div className={styles.featureBody}>
              <div className={styles.featureKicker}>Völker</div>
              <h3 className={styles.featureName}>37 Volksfähigkeiten</h3>
              <div className={styles.featureTeaser}>Zwei aktive, zwei passive je Volk — mit Classic-Vergleich.</div>
            </div>
          </a>
          <a href="/forever/legacy" className={styles.feature} style={{ backgroundImage: `url(${FOREVER_FEATURES.journey})` }}>
            <div className={styles.featureWash} />
            <div className={styles.featureBody}>
              <div className={styles.featureKicker}>Legacy-Baum</div>
              <h3 className={styles.featureName}>16 Punkte zum Start</h3>
              <div className={styles.featureTeaser}>Kontoweite Fortschritte planen, drei Kategorien.</div>
            </div>
          </a>
        </div>
      </section>

      {/* --- Knowledge, on parchment ------------------------------------------- */}
      <section
        className={styles.paper}
        id="wissen"
        aria-labelledby="wissen-title"
        style={{ '--paper': `url(${FOREVER_BG.paper})` } as React.CSSProperties}
      >
        <div className={styles.paperInner}>
          <Head id="wissen-title" title="Alles über Forever" aside="Stand der Ankündigung · auf Deutsch" />
          <div className={styles.features}>
            {WISSEN_TOPICS.map((topic) => (
              <a
                key={topic.slug}
                href={`/forever/wissen/${topic.slug}`}
                className={styles.feature}
                style={{ backgroundImage: `url(${FOREVER_FEATURES[topic.art]})` }}
              >
                <div className={styles.featureWash} />
                <div className={styles.featureBody}>
                  <div className={styles.featureKicker}>{topic.kicker}</div>
                  <h3 className={styles.featureName}>{topic.title}</h3>
                  <div className={styles.featureTeaser}>{topic.teaser}</div>
                </div>
              </a>
            ))}
          </div>

          <div style={{ marginTop: '2.4rem' }}>
            <Head
              id="combos"
              title="Wer kann was"
              aside={
                <a href="/forever/voelker" className={styles.sectionLink}>
                  Volksfähigkeiten im Vergleich →
                </a>
              }
            />
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
                          const factionOnly = race.byFaction?.alliance?.includes(cls)
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
            <p style={{ margin: '0.6rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span className={styles.new}>Blau</span> sind Paarungen, die es im Original nicht gab.
              (A)/(H): nur auf dieser Seite der Skyborne.
            </p>
          </div>
        </div>
      </section>

      {/* --- Roster ----------------------------------------------------------- */}
      <section className={styles.section} id="aufstellung" aria-labelledby="roster">
        <Head id="roster" title="Wer spielt was" aside={`${de(roster.length)} eingetragen`} />
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
                              {row.name} {row.surname}
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

      {!viewer ? (
        <Panel
          title="Wen spielst du in Forever?"
          subtitle="Zum Eintragen braucht es ein Konto — die Aufstellung sehen alle."
        >
          <p className={styles.prose}>
            Melde dich an, um deinen geplanten Charakter mit Vor- und Nachnamen, Volk, Klasse und
            Rolle einzutragen. Noch kein Konto? Registrieren dauert eine Minute.
          </p>
          <div className={styles.ctaRow} style={{ justifyContent: 'flex-start', marginTop: '0.4rem' }}>
            <a href="/anmelden" className={styles.ctaGold} id="mein-charakter">
              Anmelden
            </a>
            <a href="/registrieren" className={styles.cta}>
              Registrieren
            </a>
          </div>
        </Panel>
      ) : (
      <Panel
        title={mine ? `${mine.name} ${mine.surname} — ${CLASS_LABELS[mine.className]}` : 'Wen spielst du in Forever?'}
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
            surname: mine?.surname ?? '',
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
      )}

      {/* --- Raids ---------------------------------------------------------------- */}
      <section className={styles.section} aria-labelledby="raids">
        <Head id="raids" title="Die Schlachtzüge" aside="dazu zwei neue, die Blizzard noch nicht benannt hat" />
        <div className={styles.tiles}>
          {FOREVER_ART.raids.map((raid) => (
            <div key={raid.slug} className={styles.tile} style={{ backgroundImage: `url(${raid.url})` }}>
              <div className={styles.tileWash} />
              <div className={styles.tileBody}>
                <div className={styles.tileKicker}>Forever</div>
                <h3 className={styles.tileName}>{raid.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Achievements era ----------------------------------------------------- */}
      <section
        className={styles.band}
        aria-labelledby="era"
        style={{ backgroundImage: `url(${FOREVER_ZONES.darkshore})` }}
      >
        <div className={styles.bandWash} />
        <div className={styles.bandInner}>
          <Head id="era" title="Forever-Erfolge" aside="beginnen bei null" />
          <div className={styles.era}>
            <div>
              <div className={styles.eraValue}>{de(progress.nights)}</div>
              <div className={styles.eraLabel}>Raidabende</div>
            </div>
            <div>
              <div className={styles.eraValue}>{de(progress.pulls)}</div>
              <div className={styles.eraLabel}>Pulls</div>
            </div>
            <div>
              <div className={styles.eraValue}>{de(progress.kills)}</div>
              <div className={styles.eraLabel}>Bosskills</div>
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
    </div>
  );
}
