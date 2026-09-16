import type { Metadata } from 'next';
import { getViewer } from '../../../lib/auth';
import { FOREVER_BG, FOREVER_LOGO, FOREVER_MARK } from '../../../lib/forever-art';
import { loadPoll } from '../../../lib/guild-name-poll';
import { addNameAction, removeNameAction, voteNameAction } from './actions';
import styles from '../forever.module.css';
import local from './poll.module.css';
import forms from '../../../components/auth/form.module.css';

export const metadata: Metadata = {
  title: 'Gildenname — Abstimmung',
  description: 'Wie soll die Gilde in World of Warcraft: Forever heißen? Mitglieder stimmen hoch und runter.',
};

type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * The poll page.
 *
 * Everyone sees the standings; members vote. Each row is a plain form pair
 * — up and down — so it works without JavaScript and the server enforces
 * one vote per member and name. Withdrawing is pressing the same arrow again.
 */
export default async function GildennamePage({ searchParams }: { searchParams: Search }) {
  const [viewer, search] = await Promise.all([getViewer(), searchParams]);
  const poll = await loadPoll(viewer?.id ?? null);
  const ok = typeof search.ok === 'string' ? search.ok : null;
  const error = typeof search.fehler === 'string' ? search.fehler : null;
  const maxAbs = Math.max(1, ...poll.options.map((o) => Math.max(o.up, o.down)));

  return (
    <div className={styles.forever}>
      <section className={styles.topicHero} aria-labelledby="poll-title">
        <div className={styles.heroArt} style={{ backgroundImage: `url(${FOREVER_BG.masthead})` }} />
        <div className={styles.heroWash} />
        <div className={styles.cloudFront} style={{ backgroundImage: `url(${FOREVER_BG.cloud})` }} />
        <div className={styles.topicInner}>
          <a href="/forever">
            <img className={styles.topicLogo} src={FOREVER_LOGO} alt="World of Warcraft: Forever" width={700} height={570} />
          </a>
          <p className={styles.topicKicker}>
            Abstimmung · {poll.options.length} Vorschläge · {poll.votes} Stimmen von {poll.voters}{' '}
            {poll.voters === 1 ? 'Mitglied' : 'Mitgliedern'}
          </p>
          <h1 id="poll-title" className={styles.topicTitle}>
            Wie heißen wir in Forever?
          </h1>
          <p className={styles.topicIntro}>
            Jedes Mitglied kann jeden Namen hoch- oder runterstimmen — eine Stimme pro Name, jederzeit
            änderbar. Der Saldo aus Hoch und Runter entscheidet die Reihenfolge.
            {viewer
              ? ' Du bist angemeldet: Klick auf die Pfeile.'
              : ' Zum Abstimmen brauchst du ein Konto; registrieren dauert eine Minute.'}
          </p>
          {!viewer && (
            <div className={styles.ctaRow} style={{ justifyContent: 'flex-start' }}>
              <a href="/registrieren" className={styles.ctaGold}>
                Registrieren &amp; abstimmen
              </a>
              <a href="/anmelden" className={styles.cta}>
                Anmelden
              </a>
            </div>
          )}
        </div>
      </section>

      {ok && (
        <p className={forms.notice} style={{ marginTop: '1.2rem' }}>
          {ok}
        </p>
      )}
      {error && (
        <p className={forms.error} style={{ marginTop: '1.2rem' }}>
          {error}
        </p>
      )}

      <section className={styles.section} id="namen" aria-labelledby="standings">
        <div className={styles.sectionHead}>
          <h2 id="standings" className={styles.sectionTitle}>
            <img className={styles.mark} src={FOREVER_MARK} alt="" width={26} height={29} />
            Die Vorschläge
          </h2>
          <span className={styles.sectionLink}>Saldo = Hoch − Runter · gleicher Pfeil noch einmal zieht die Stimme zurück</span>
        </div>

        <ol className={local.list}>
          {poll.options.map((option, index) => (
            <li key={option.id} className={`${local.row} ${option.mine !== 0 ? local.rowMine : ''}`}>
              <span className={local.rank}>{index + 1}</span>

              <form action={voteNameAction} className={local.voteForm}>
                <input type="hidden" name="id" value={option.id} />
                <input type="hidden" name="value" value="1" />
                <button
                  type="submit"
                  className={`${local.arrow} ${option.mine === 1 ? local.arrowUpActive : ''}`}
                  disabled={!viewer}
                  title={viewer ? (option.mine === 1 ? 'Stimme zurückziehen' : 'Hochstimmen') : 'Zum Abstimmen anmelden'}
                  aria-label={`${option.name} hochstimmen`}
                >
                  ▲
                </button>
              </form>

              <div className={local.body}>
                <div className={local.name}>{option.name}</div>
                <div className={local.bars} aria-hidden="true">
                  <span className={local.barUp} style={{ width: `${(option.up / maxAbs) * 100}%` }} />
                  <span className={local.barDown} style={{ width: `${(option.down / maxAbs) * 100}%` }} />
                </div>
                <div className={local.counts}>
                  <span className={local.up}>▲ {option.up}</span>
                  <span className={local.down}>▼ {option.down}</span>
                  {option.mine === 1 && <span className={local.mine}>deine Stimme: hoch</span>}
                  {option.mine === -1 && <span className={local.mine}>deine Stimme: runter</span>}
                </div>
              </div>

              <div className={`${local.score} ${option.score > 0 ? local.scorePlus : option.score < 0 ? local.scoreMinus : ''}`}>
                {option.score > 0 ? `+${option.score}` : option.score}
              </div>

              <form action={voteNameAction} className={local.voteForm}>
                <input type="hidden" name="id" value={option.id} />
                <input type="hidden" name="value" value="-1" />
                <button
                  type="submit"
                  className={`${local.arrow} ${option.mine === -1 ? local.arrowDownActive : ''}`}
                  disabled={!viewer}
                  title={viewer ? (option.mine === -1 ? 'Stimme zurückziehen' : 'Runterstimmen') : 'Zum Abstimmen anmelden'}
                  aria-label={`${option.name} runterstimmen`}
                >
                  ▼
                </button>
              </form>

              {viewer?.isAdmin && (
                <form action={removeNameAction} className={local.voteForm}>
                  <input type="hidden" name="id" value={option.id} />
                  <button type="submit" className={local.remove} title="Vorschlag entfernen">
                    ✕
                  </button>
                </form>
              )}
            </li>
          ))}
        </ol>
      </section>

      {viewer?.isAdmin && (
        <section className={styles.section} aria-labelledby="add-name">
          <div className={styles.sectionHead}>
            <h2 id="add-name" className={styles.sectionTitle}>
              <img className={styles.mark} src={FOREVER_MARK} alt="" width={26} height={29} />
              Vorschlag ergänzen
            </h2>
            <span className={styles.sectionLink}>nur Offiziere</span>
          </div>
          <form action={addNameAction} className={local.addForm}>
            <input className={local.addInput} name="name" required minLength={2} maxLength={40} placeholder="Neuer Gildenname" />
            <button type="submit" className={styles.ctaGold}>
              Zur Wahl stellen
            </button>
          </form>
        </section>
      )}

      <p className={styles.footnote}>
        Eine Stimme pro Mitglied und Name. Wer eine Stimme ändern will, klickt den anderen Pfeil; wer
        sie zurückziehen will, denselben noch einmal. Die Abstimmung ist offen, bis die Offiziere sie
        schließen.
      </p>
    </div>
  );
}
