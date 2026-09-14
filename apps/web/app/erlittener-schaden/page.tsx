import type { Metadata } from 'next';
import {
  DAMAGE_TAKEN_METRICS,
  DAMAGE_TAKEN_METRIC_KEYS,
  SCRIPTED_DAMAGE_THRESHOLD,
  type DamageTakenMetricKey,
} from '@ina/core';
import { OrnateFrame, Panel } from '../../components/ui/frame';
import { ClassName, Divider } from '../../components/ui/bits';
import { DataTable, type Column } from '../../components/ui/data-table';
import { loadFilterOptions } from '../../lib/leaderboards';
import {
  DEFAULT_MIN_PULLS,
  loadDamageTaken,
  loadDamageTakenCoverage,
  type DamageTakenRow,
} from '../../lib/damage-taken';
import { formatAmount, formatNumber } from '../../lib/wow';
import styles from '../leaderboards/leaderboards.module.css';

export const metadata: Metadata = { title: 'Erlittener Schaden' };
export const revalidate = 900;

type Search = Record<string, string | string[] | undefined>;

function one(search: Search, key: string): string | undefined {
  const value = search[key];
  return Array.isArray(value) ? value[0] : value;
}

const ROLES = ['Tank', 'Healer', 'DPS'] as const;

export default async function DamageTakenPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;

  const metricRaw = one(search, 'wert');
  const metricKey: DamageTakenMetricKey = DAMAGE_TAKEN_METRIC_KEYS.includes(
    metricRaw as DamageTakenMetricKey,
  )
    ? (metricRaw as DamageTakenMetricKey)
    : 'perMinute';
  const metric = DAMAGE_TAKEN_METRICS[metricKey];

  // Tanks take the most damage by design, so an unfiltered list ranks the
  // roster by role rather than by anything worth knowing. The role filter is
  // therefore the first control, not a refinement hidden at the bottom.
  const roleRaw = one(search, 'rolle');
  const role = (ROLES as readonly string[]).includes(roleRaw ?? '') ? roleRaw : undefined;

  const expansionRaw = Number(one(search, 'erweiterung'));
  const expansionId = Number.isFinite(expansionRaw) && expansionRaw > 0 ? expansionRaw : undefined;

  const [options, coverage, rows] = await Promise.all([
    loadFilterOptions(),
    loadDamageTakenCoverage(),
    loadDamageTaken({ expansionId, role, minPulls: DEFAULT_MIN_PULLS }),
  ]);

  const ranked = [...rows]
    .sort((a, b) => {
      if (metricKey === 'total') return b.total - a.total;
      if (metricKey === 'perFight') return b.perPull - a.perPull;
      return b.perMinute - a.perMinute;
    })
    .slice(0, 150);

  const href = (next: Partial<{ wert: string; rolle: string; erweiterung: string }>): string => {
    const params = new URLSearchParams();
    params.set('wert', next.wert ?? metricKey);
    const nextRole = next.rolle ?? role;
    if (nextRole && nextRole !== 'alle') params.set('rolle', nextRole);
    const nextExpansion = next.erweiterung ?? (expansionId ? String(expansionId) : undefined);
    if (nextExpansion && nextExpansion !== 'alle') params.set('erweiterung', nextExpansion);
    return `/erlittener-schaden?${params.toString()}`;
  };

  const highlight = (active: boolean): string | undefined =>
    active ? 'var(--gold-300)' : undefined;

  const columns: readonly Column<DamageTakenRow>[] = [
    {
      key: 'name',
      header: 'Spieler',
      render: (row) => (
        <a href={`/players/${encodeURIComponent(row.name)}`}>
          <ClassName name={row.name} className={row.className} />
        </a>
      ),
    },
    { key: 'role', header: 'Rolle', render: (row) => row.role ?? '—' },
    {
      key: 'perMinute',
      header: 'Je Minute',
      numeric: true,
      render: (row) => (
        <span style={{ color: highlight(metricKey === 'perMinute') }}>
          {formatAmount(row.perMinute)}
        </span>
      ),
    },
    {
      key: 'perPull',
      header: 'Je Pull',
      numeric: true,
      render: (row) => (
        <span style={{ color: highlight(metricKey === 'perFight') }}>
          {formatAmount(row.perPull)}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Gesamt',
      numeric: true,
      render: (row) => (
        <span style={{ color: highlight(metricKey === 'total') }}>{formatAmount(row.total)}</span>
      ),
    },
    {
      key: 'pulls',
      header: 'Pulls',
      numeric: true,
      render: (row) => formatNumber(row.pulls),
    },
    {
      key: 'worstPull',
      header: 'Schlimmster Pull',
      numeric: true,
      render: (row) => formatAmount(row.worstPull),
    },
  ];

  return (
    <>
      <OrnateFrame title="Erlittener Schaden" subtitle={metric.label}>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', maxWidth: '68ch' }}>
          {metric.formula} {metric.reason}
        </p>
      </OrnateFrame>

      {coverage.pendingFights > 0 && (
        <Panel title="Unvollständig">
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Erlittener Schaden ist erst für {formatNumber(coverage.importedFights)} von{' '}
            {formatNumber(coverage.importedFights + coverage.pendingFights)} Pulls importiert. Die
            Liste ist deshalb noch keine Endabrechnung; gewertet werden ausschließlich die bereits
            importierten Pulls, damit die fehlenden die Durchschnitte nicht nach unten ziehen.
          </p>
        </Panel>
      )}

      <Panel title="Filter">
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Wert</span>
          <div className={styles.filterChips}>
            {DAMAGE_TAKEN_METRIC_KEYS.map((key) => (
              <a
                key={key}
                href={href({ wert: key })}
                className={metricKey === key ? styles.chipActive : styles.chip}
              >
                {DAMAGE_TAKEN_METRICS[key].label}
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

      <Divider label={metric.label} />

      <details className={styles.disclosure}>
        <summary>Wie wird das berechnet?</summary>
        <p>
          <strong>{metric.label}:</strong> {metric.formula}
        </p>
        <p>
          Die <strong>Je-Minute-Zahl</strong> misst gegen die Länge der Pulls, an denen jemand
          teilgenommen hat — nicht gegen seine eigene Lebenszeit im Kampf. Sonst stünde belohnt da,
          wer früh stirbt: weniger erlittener Schaden auf einer kürzeren Uhr.
        </p>
        <p>
          <strong>Rollen stehen nicht im selben Rennen.</strong> Ein Tank nimmt
          konstruktionsbedingt ein Vielfaches eines Heilers. Ohne Rollenfilter sortiert diese Liste
          die Gilde nach Aufgabe statt nach irgendetwas Interessantem — deshalb steht der Filter
          oben.
        </p>
        <p>
          <strong>Gescriptete Sofort-Tode sind ausgeklammert.</strong> Manche Bosse töten nicht mit
          Schaden, sondern setzen den Wert auf eine Kennzahl: Sha of Pride verbucht mit{' '}
          <em>Ethereal Corruption</em> genau {formatNumber(SCRIPTED_DAMAGE_THRESHOLD)} — 2²⁹, eine
          runde Binärzahl. Pulls ab diesem Wert werden nicht gewertet; betroffen sind{' '}
          {formatNumber(coverage.excludedRows)} Pull-Zeilen von{' '}
          {formatNumber(coverage.excludedCharacters)} Spielern. Zum Vergleich: der höchste{' '}
          <em>echte</em> Wert eines einzelnen Pulls liegt bei {formatAmount(coverage.worstRealPull)}
          . Zwischen beiden liegt nichts, die Grenze ist also kein Ermessen.
        </p>
        <p>
          Importiert wird trotzdem unverfälscht — in der Datenbank stehen die Zahlen so, wie
          Warcraft Logs sie liefert. Die Regel greift beim Abfragen und ist jederzeit änderbar, ohne
          erneut zu importieren.
        </p>
        <p>
          Gezeigt werden nur Spieler mit mindestens {formatNumber(DEFAULT_MIN_PULLS)} gewerteten
          Pulls; darunter sagt ein Durchschnitt nichts aus.
        </p>
      </details>

      <Panel
        title={metric.label}
        subtitle={`${formatNumber(ranked.length)} von ${formatNumber(rows.length)} Spielern · ${formatNumber(
          ranked.reduce((sum, row) => sum + row.pulls, 0),
        )} gewertete Pull-Teilnahmen`}
        flush
      >
        <DataTable
          columns={columns}
          rows={ranked}
          rowKey={(row) => row.characterId}
          showRank
          emptyMessage="Noch kein erlittener Schaden importiert."
        />
      </Panel>
    </>
  );
}
