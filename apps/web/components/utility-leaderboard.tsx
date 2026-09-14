import { OrnateFrame, Panel } from './ui/frame';
import { PAGE_ART } from '../lib/zone-art';
import { ClassName, Divider } from './ui/bits';
import { DataTable, type Column } from './ui/data-table';
import { loadFilterOptions } from '../lib/leaderboards';
import {
  DEFAULT_MIN_REPORTS,
  UTILITY_KINDS,
  UTILITY_METRICS,
  loadUtility,
  loadUtilityTotals,
  utilityValue,
  type UtilityKind,
  type UtilityMetric,
  type UtilityRow,
} from '../lib/utility';
import { formatDuration, formatNumber } from '../lib/wow';
import styles from '../app/leaderboards/leaderboards.module.css';

/**
 * Interrupts and dispels share one board.
 *
 * They are the same shape of question about the same table, and two copies of
 * this page would drift apart the first time one of them got a fix.
 */

type Search = Record<string, string | string[] | undefined>;

function one(search: Search, key: string): string | undefined {
  const value = search[key];
  return Array.isArray(value) ? value[0] : value;
}

const ROLES = ['Tank', 'Healer', 'DPS'] as const;

export async function UtilityLeaderboard({
  kind,
  path,
  search,
}: {
  kind: UtilityKind;
  path: string;
  search: Search;
}) {
  const info = UTILITY_KINDS[kind];

  const metricRaw = one(search, 'wert');
  const metric: UtilityMetric = (['perHour', 'perNight', 'total'] as const).includes(
    metricRaw as UtilityMetric,
  )
    ? (metricRaw as UtilityMetric)
    : 'perHour';

  const roleRaw = one(search, 'rolle');
  const role = (ROLES as readonly string[]).includes(roleRaw ?? '') ? roleRaw : undefined;

  const expansionRaw = Number(one(search, 'erweiterung'));
  const expansionId = Number.isFinite(expansionRaw) && expansionRaw > 0 ? expansionRaw : undefined;

  const [options, totals, rows] = await Promise.all([
    loadFilterOptions(),
    loadUtilityTotals(),
    loadUtility({ expansionId, role, minReports: DEFAULT_MIN_REPORTS }),
  ]);

  const ranked = [...rows]
    .sort((a, b) => utilityValue(b, kind, metric) - utilityValue(a, kind, metric))
    .slice(0, 150);

  const href = (next: Partial<{ wert: string; rolle: string; erweiterung: string }>): string => {
    const params = new URLSearchParams();
    params.set('wert', next.wert ?? metric);
    const nextRole = next.rolle ?? role;
    if (nextRole && nextRole !== 'alle') params.set('rolle', nextRole);
    const nextExpansion = next.erweiterung ?? (expansionId ? String(expansionId) : undefined);
    if (nextExpansion && nextExpansion !== 'alle') params.set('erweiterung', nextExpansion);
    return `${path}?${params.toString()}`;
  };

  const decimals = (value: number): string =>
    metric === 'total' ? formatNumber(value) : formatNumber(value, 1);

  const columns: readonly Column<UtilityRow>[] = [
    {
      key: 'name',
      header: 'Mitglied',
      render: (row) => (
        <a href={`/mitglieder/${encodeURIComponent(row.subjectId)}`}>
          <ClassName name={row.name} className={row.className} />
        </a>
      ),
    },
    { key: 'role', header: 'Rolle', render: (row) => row.role ?? '—' },
    {
      key: 'value',
      header: UTILITY_METRICS[metric].label,
      numeric: true,
      render: (row) => (
        <span style={{ color: 'var(--gold-300)' }}>
          {decimals(utilityValue(row, kind, metric))}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Gesamt',
      numeric: true,
      render: (row) => formatNumber(kind === 'interrupts' ? row.interrupts : row.dispels),
    },
    {
      key: 'other',
      header: kind === 'interrupts' ? 'Dispels' : 'Unterbr.',
      numeric: true,
      render: (row) => formatNumber(kind === 'interrupts' ? row.dispels : row.interrupts),
    },
    { key: 'reports', header: 'Logs', numeric: true, render: (row) => formatNumber(row.reports) },
    {
      key: 'clock',
      header: 'Kampfzeit',
      numeric: true,
      render: (row) => formatDuration(row.combatMs),
    },
  ];

  return (
    <>
      <OrnateFrame
        art={PAGE_ART.utility}
        title={info.label}
        subtitle={`${formatNumber(
          kind === 'interrupts' ? totals.interrupts : totals.dispels,
        )} insgesamt über ${formatNumber(totals.reports)} Logs`}
      >
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', maxWidth: '68ch' }}>
          {info.description}
        </p>
      </OrnateFrame>

      <Panel title="Filter">
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Wert</span>
          <div className={styles.filterChips}>
            {(Object.keys(UTILITY_METRICS) as UtilityMetric[]).map((key) => (
              <a
                key={key}
                href={href({ wert: key })}
                className={metric === key ? styles.chipActive : styles.chip}
              >
                {UTILITY_METRICS[key].label}
              </a>
            ))}
          </div>
        </div>

        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Rolle</span>
          <div className={styles.filterChips}>
            <a
              href={href({ rolle: 'alle' })}
              className={role === undefined ? styles.chipActive : styles.chip}
            >
              Alle Rollen
            </a>
            {ROLES.map((value) => (
              <a
                key={value}
                href={href({ rolle: value })}
                className={role === value ? styles.chipActive : styles.chip}
              >
                {value}
              </a>
            ))}
          </div>
        </div>

        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Erweiterung</span>
          <div className={styles.filterChips}>
            <a
              href={href({ erweiterung: 'alle' })}
              className={expansionId === undefined ? styles.chipActive : styles.chip}
            >
              Alle
            </a>
            {options.expansions.map((expansion) => (
              <a
                key={expansion.id}
                href={href({ erweiterung: String(expansion.id) })}
                className={expansionId === expansion.id ? styles.chipActive : styles.chip}
              >
                {expansion.name}
              </a>
            ))}
          </div>
        </div>
      </Panel>

      <Divider label={UTILITY_METRICS[metric].label} />

      <details className={styles.disclosure}>
        <summary>Wie wird das berechnet?</summary>
        <p>
          <strong>{UTILITY_METRICS[metric].label}:</strong> {UTILITY_METRICS[metric].formula}
        </p>
        <p>
          Gezählt wird <strong>pro Person</strong>: wo Charaktere einer Person zugeordnet sind,
          zählen ihre Unterbrechungen zusammen. Ein Raider mit vier Twinks soll nicht viermal
          halb in der Liste stehen.
        </p>
        <p>
          <strong>Nur ganze Logs, keine einzelnen Pulls.</strong> Warcraft Logs liefert für
          Unterbrechungen und Dispels keine Aufschlüsselung nach Kampf — die Antwort summiert den
          abgefragten Bereich und nennt keine Kampf-Kennung. Eine Aufteilung auf einzelne Bosse
          wäre erfunden, deshalb gibt es sie hier nicht. Die Kampfzeit im Nenner stammt aus genau
          denselben Logs, damit Zähler und Nenner dasselbe meinen.
        </p>
        <p>
          <strong>Rollen stehen nicht im selben Rennen.</strong> Wer unterbricht, hängt an der
          Klasse und am Kampfauftrag; die Rolle ist die, die jemand überwiegend gespielt hat.
        </p>
        <p>
          Gezeigt werden nur Mitglieder mit mindestens {formatNumber(DEFAULT_MIN_REPORTS)} Logs, in
          denen überhaupt etwas zustande kam.
        </p>
      </details>

      <Panel
        title={UTILITY_METRICS[metric].label}
        subtitle={`${formatNumber(ranked.length)} von ${formatNumber(rows.length)} Mitgliedern`}
        flush
      >
        <DataTable
          columns={columns}
          rows={ranked}
          rowKey={(row) => row.subjectId}
          showRank
          emptyMessage="Nichts importiert."
        />
      </Panel>
    </>
  );
}
