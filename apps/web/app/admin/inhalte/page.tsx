import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  ACHIEVEMENT_CATEGORIES,
  SUBJECT_METRIC_KEYS,
  METRIC_LABELS,
  TIER_LABELS,
  TIER_ORDER,
  type AchievementCategory,
} from '@ina/core';
import { OrnateFrame, Panel } from '../../../components/ui/frame';
import { ClassName, Divider } from '../../../components/ui/bits';
import { PAGE_ART } from '../../../lib/zone-art';
import { getViewer } from '../../../lib/auth';
import { loadSettings } from '../../../lib/settings';
import { HALL_OF_FAME_METRICS } from '../../../lib/hall-of-fame';
import { listCustomRecords, loadCustomAchievements } from '../../../lib/custom-content';
import { CLASS_NAMES } from '../../../lib/wow';
import { formatMetric } from '../../../components/achievements/card';
import {
  addAchievementAction,
  addRecordAction,
  addTitleAction,
  removeAchievementAction,
  removeRecordAction,
  removeTitleAction,
} from './actions';
import styles from '../../../components/auth/form.module.css';

export const metadata: Metadata = { title: 'Inhalte' };

type Search = Promise<Record<string, string | string[] | undefined>>;

const CATEGORY_ORDER: AchievementCategory[] = [
  'lifetime',
  'progress',
  'performance',
  'reliability',
  'fun',
];

function Remove({
  action,
  id,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
}) {
  return (
    <form action={action} style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={styles.smallDanger} aria-label={`${label} entfernen`}>
        Entfernen
      </button>
    </form>
  );
}

export default async function ContentAdminPage({ searchParams }: { searchParams: Search }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/anmelden');
  // Not a 403 page: an ordinary member has no reason to know this route exists.
  if (!viewer.isAdmin) redirect('/konto');

  const search = await searchParams;
  const ok = typeof search.ok === 'string' ? search.ok : null;
  const error = typeof search.fehler === 'string' ? search.fehler : null;

  const [settings, achievements, records] = await Promise.all([
    loadSettings(),
    loadCustomAchievements(),
    listCustomRecords(),
  ]);

  return (
    <>
      <OrnateFrame art={PAGE_ART.account} title="Inhalte" subtitle="Offiziere">
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '68ch' }}>
          Titel, Erfolge und Rekorde, die nicht im Code stehen. Alles hier rechnet mit denselben
          Kennzahlen wie das Eingebaute — ein Erfolg ist eine Schwelle auf einer Kennzahl, ein
          berechneter Rekord ihr Höchstwert. Nur manuelle Rekorde sind Einträge von Hand, und so
          werden sie auch ausgewiesen.
        </p>
      </OrnateFrame>

      {ok && <p className={styles.notice}>{ok}</p>}
      {error && <p className={styles.error}>{error}</p>}

      {/* --- Hall of Fame ------------------------------------------------- */}
      <Divider label="Hall of Fame" />

      <Panel
        title="Titel"
        subtitle={`${settings.hallOfFameTitles.length} Titel · wer den höchsten Wert einer Kennzahl hält`}
      >
        <ul style={{ margin: '0 0 1.2rem', padding: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
          {settings.hallOfFameTitles.map((title) => (
            <li
              key={title.id}
              style={{ display: 'flex', gap: '0.8rem', alignItems: 'baseline', flexWrap: 'wrap' }}
            >
              <strong style={{ color: 'var(--gold-200)' }}>{title.title}</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                {title.subtitle}
              </span>
              <code style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {title.metric} · {title.direction === 'lowest' ? 'niedrigster' : 'höchster'}
              </code>
              <Remove action={removeTitleAction} id={title.id} label={title.title} />
            </li>
          ))}
        </ul>

        <form action={addTitleAction} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Titel</span>
            <input className={styles.input} name="title" required minLength={2} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Untertitel</span>
            <input className={styles.input} name="subtitle" placeholder="Die meisten …" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Kennzahl</span>
            <select className={styles.input} name="metric" required>
              {HALL_OF_FAME_METRICS.map((entry) => (
                <option key={entry.key} value={entry.key}>
                  {entry.label}
                </option>
              ))}
            </select>
            <span className={styles.hint}>
              Nur Kennzahlen, hinter denen eine Abfrage steht. Neue Kennzahlen sind Code, keine
              Einstellung.
            </span>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Gewinnt</span>
            <select className={styles.input} name="direction">
              <option value="highest">der höchste Wert</option>
              <option value="lowest">der niedrigste Wert</option>
            </select>
          </label>
          <button type="submit" className={styles.submit}>
            Titel anlegen
          </button>
        </form>
      </Panel>

      {/* --- Achievements ------------------------------------------------- */}
      <Divider label="Erfolge" />

      <Panel
        title="Eigene Erfolge"
        subtitle={`${achievements.length} zusätzlich zu den ${40} eingebauten`}
      >
        {achievements.length > 0 && (
          <ul style={{ margin: '0 0 1.2rem', padding: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
            {achievements.map((entry) => (
              <li
                key={entry.id}
                style={{ display: 'flex', gap: '0.8rem', alignItems: 'baseline', flexWrap: 'wrap' }}
              >
                <strong style={{ color: 'var(--gold-200)' }}>{entry.name}</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  {ACHIEVEMENT_CATEGORIES[entry.category].label} · {METRIC_LABELS[entry.metric]}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {entry.steps
                    .map((step) => `${TIER_LABELS[step.tier]} ${formatMetric(step.threshold, entry.unit)}`)
                    .join(' · ')}
                </span>
                <Remove
                  action={removeAchievementAction}
                  id={entry.id.replace(/^custom:/, '')}
                  label={entry.name}
                />
              </li>
            ))}
          </ul>
        )}

        <form action={addAchievementAction} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input className={styles.input} name="name" required minLength={2} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Beschreibung</span>
            <input
              className={styles.input}
              name="description"
              required
              minLength={4}
              placeholder="Was wird gezählt, in den Worten, die ein Leser braucht."
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Kategorie</span>
            <select className={styles.input} name="category">
              {CATEGORY_ORDER.map((key) => (
                <option key={key} value={key}>
                  {ACHIEVEMENT_CATEGORIES[key].label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Kennzahl</span>
            <select className={styles.input} name="metric">
              {SUBJECT_METRIC_KEYS.map((key) => (
                <option key={key} value={key}>
                  {METRIC_LABELS[key]}
                </option>
              ))}
            </select>
            <span className={styles.hint}>
              Zeit-Kennzahlen werden in Stunden eingegeben, Schaden und Heilung als volle Zahl.
            </span>
          </label>
          <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(7rem, 1fr))' }}>
            {TIER_ORDER.map((tier) => (
              <label key={tier} className={styles.field}>
                <span className={styles.label}>{TIER_LABELS[tier]}</span>
                <input className={styles.input} name={`threshold-${tier}`} inputMode="decimal" />
              </label>
            ))}
          </div>
          <span className={styles.hint}>
            Leere Stufen werden übersprungen. Die Schwellen müssen von Stufe zu Stufe steigen.
          </span>
          <button type="submit" className={styles.submit}>
            Erfolg anlegen
          </button>
        </form>
      </Panel>

      {/* --- Records ------------------------------------------------------ */}
      <Divider label="Rekorde" />

      <Panel title="Eigene Rekorde" subtitle={`${records.length} zusätzlich zu den eingebauten`}>
        {records.length > 0 && (
          <ul style={{ margin: '0 0 1.2rem', padding: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
            {records.map((row) => (
              <li
                key={row.id}
                style={{ display: 'flex', gap: '0.8rem', alignItems: 'baseline', flexWrap: 'wrap' }}
              >
                <strong style={{ color: 'var(--gold-200)' }}>{row.label}</strong>
                {row.metric ? (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    berechnet · {METRIC_LABELS[row.metric as keyof typeof METRIC_LABELS] ?? row.metric}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    manuell · {row.value}
                    {row.holder && (
                      <>
                        {' · '}
                        <ClassName name={row.holder} className={row.holderClass} />
                      </>
                    )}
                  </span>
                )}
                <Remove action={removeRecordAction} id={row.id} label={row.label} />
              </li>
            ))}
          </ul>
        )}

        <form action={addRecordAction} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.label}>Bezeichnung</span>
            <input className={styles.input} name="label" required minLength={2} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Erklärung</span>
            <input
              className={styles.input}
              name="formula"
              required
              minLength={4}
              placeholder="Was der Wert bedeutet — steht unter dem Rekord."
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Berechnet aus Kennzahl</span>
            <select className={styles.input} name="metric">
              <option value="">— kein Wert aus den Daten, manuell eintragen —</option>
              {SUBJECT_METRIC_KEYS.map((key) => (
                <option key={key} value={key}>
                  {METRIC_LABELS[key]}
                </option>
              ))}
            </select>
            <span className={styles.hint}>
              Mit Kennzahl gewinnt automatisch, wer den höchsten Wert hält — pro Person über alle
              Charaktere. Ohne Kennzahl gelten die Felder darunter, und der Rekord wird als
              manuell ausgewiesen.
            </span>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Wert (manuell)</span>
            <input className={styles.input} name="value" placeholder="z. B. 12.05.2024" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Träger (manuell)</span>
            <input className={styles.input} name="holder" placeholder="Charakter- oder Personenname" />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Klasse des Trägers</span>
            <select className={styles.input} name="holderClass">
              <option value="">—</option>
              {CLASS_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Zusatz</span>
            <input className={styles.input} name="context" placeholder="Boss, Abend, Anlass …" />
          </label>
          <button type="submit" className={styles.submit}>
            Rekord anlegen
          </button>
        </form>
      </Panel>
    </>
  );
}
