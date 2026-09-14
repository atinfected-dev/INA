import type { Metadata } from 'next';
import { PARSE_METRICS, parseMetric, rankByParseMetric } from '@ina/core';
import { OrnateFrame, Panel } from '../../components/ui/frame';
import { PAGE_ART, zoneArt } from '../../lib/zone-art';
import { ClassName, Divider, ParseValue, SampleSize } from '../../components/ui/bits';
import { DataTable, type Column } from '../../components/ui/data-table';
import { loadFilterOptions, loadParseLeaderboard, type LeaderboardSubject } from '../../lib/leaderboards';
import { loadSettings } from '../../lib/settings';
import styles from './leaderboards.module.css';

export const metadata: Metadata = { title: 'Ranglisten' };
export const revalidate = 900;

interface Row {
  subject: LeaderboardSubject;
  value: number;
  sampleSize: number;
}

type Search = Record<string, string | string[] | undefined>;

function one(search: Search, key: string): string | undefined {
  const value = search[key];
  return Array.isArray(value) ? value[0] : value;
}

function intOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

/** Builds a query string that keeps every other filter untouched. */
function href(search: Search, changes: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single) params.set(key, single);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === '') params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query === '' ? '/leaderboards' : `/leaderboards?${query}`;
}

function FilterRow({
  label,
  options,
  active,
  param,
  search,
  allowAll = true,
}: {
  label: string;
  options: { value: string; label: string }[];
  active: string | undefined;
  param: string;
  search: Search;
  /** False where exactly one option is always in effect, such as the metric. */
  allowAll?: boolean;
}) {
  return (
    <div className={styles.filterRow}>
      <span className={styles.filterLabel}>{label}</span>
      <div className={styles.filterChips}>
        {allowAll && (
          <a
            href={href(search, { [param]: undefined })}
            className={active === undefined ? styles.chipActive : styles.chip}
          >
            Alle
          </a>
        )}
        {options.map((option) => (
          <a
            key={option.value}
            href={href(search, { [param]: option.value })}
            className={active === option.value ? styles.chipActive : styles.chip}
          >
            {option.label}
          </a>
        ))}
      </div>
    </div>
  );
}

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;

  // Default to the figure raiders recognise from their Warcraft Logs profile.
  const metricKey = one(search, 'metric') ?? 'bestPerBoss';
  const metric = PARSE_METRICS.some((m) => m.key === metricKey)
    ? parseMetric(metricKey)
    : parseMetric('bestPerBoss');

  const expansionId = intOrUndefined(one(search, 'expansion'));
  const difficultyId = intOrUndefined(one(search, 'difficulty'));
  const className = one(search, 'class');
  const parseMetricType = one(search, 'type') === 'HPS' ? 'HPS' : 'DPS';

  const settings = await loadSettings();
  // ?min= overrides the configured threshold, so the effect of a different
  // cut-off can be seen without changing the setting for everyone.
  const minOverride = intOrUndefined(one(search, 'min'));
  const minKills =
    minOverride !== undefined && minOverride >= 0 ? minOverride : settings.minKillsForAverage;

  const [options, entries] = await Promise.all([
    loadFilterOptions(),
    loadParseLeaderboard({
      ...(expansionId === undefined ? {} : { expansionId }),
      ...(difficultyId === undefined ? {} : { difficultyId }),
      ...(className === undefined ? {} : { className }),
      metric: parseMetricType,
    }),
  ]);

  const qualified = rankByParseMetric(entries, metric, minKills);
  // Only the top of the list is rendered; the counts below must not conflate
  // that display limit with how many players actually qualify.
  const ranked = qualified.slice(0, 100);
  const excluded = entries.length - qualified.length;

  const columns: readonly Column<Row>[] = [
    {
      key: 'name',
      header: 'Spieler',
      render: (row) => (
        <>
          <ClassName name={row.subject.name} className={row.subject.className} />
          {row.subject.personName && (
            <span className={styles.person}> · {row.subject.personName}</span>
          )}
        </>
      ),
    },
    { key: 'class', header: 'Klasse', render: (row) => row.subject.className ?? '—' },
    {
      key: 'value',
      header: metric.label,
      numeric: true,
      render: (row) =>
        metric.decimals > 0 || metric.key === 'best' ? (
          <ParseValue value={row.value} decimals={metric.decimals} />
        ) : (
          row.value.toLocaleString('de-DE')
        ),
    },
    {
      key: 'sample',
      header: 'Stichprobe',
      numeric: true,
      render: (row) => <SampleSize n={row.sampleSize} />,
    },
  ];

  return (
    <>
      <OrnateFrame art={PAGE_ART.leaderboards} title="Ranglisten" subtitle="Parses">
        <p className={styles.intro} style={{ margin: 0 }}>
          Parse-Perzentile aus {entries.length.toLocaleString('de-DE')} gewerteten Spielern.
          Warcraft Logs wertet ausschließlich Kills — Wipes erzeugen keine Parses und fehlen hier
          zwangsläufig.
        </p>
      </OrnateFrame>

      <Panel title="Filter">
        <FilterRow
          label="Wertung"
          param="metric"
          active={metric.key}
          search={search}
          allowAll={false}
          options={PARSE_METRICS.map((m) => ({ value: m.key, label: m.label }))}
        />
        <FilterRow
          label="Metrik"
          param="type"
          active={parseMetricType}
          search={search}
          allowAll={false}
          options={[
            { value: 'DPS', label: 'Schaden' },
            { value: 'HPS', label: 'Heilung' },
          ]}
        />
        <FilterRow
          label="Erweiterung"
          param="expansion"
          active={expansionId === undefined ? undefined : String(expansionId)}
          search={search}
          options={options.expansions.map((e) => ({ value: String(e.id), label: e.name }))}
        />
        <FilterRow
          label="Schwierigkeit"
          param="difficulty"
          active={difficultyId === undefined ? undefined : String(difficultyId)}
          search={search}
          options={options.difficulties.map((d) => ({ value: String(d.id), label: d.name }))}
        />
        <FilterRow
          label="Klasse"
          param="class"
          active={className}
          search={search}
          options={options.classes.map((c) => ({ value: c, label: c }))}
        />
      </Panel>

      <Divider label={metric.label} />

      {/*
        The disclosure is not decoration: a ranking whose rule is hidden invites
        exactly the suspicion this whole platform is meant to avoid.
      */}
      <details className={styles.disclosure}>
        <summary>Wie wird das berechnet?</summary>
        <p>{metric.formula}</p>
        {metric.usesMinimumSample ? (
          <p>
            Mindestanzahl: <strong>{minKills} gewertete Kills</strong>. Dadurch fallen{' '}
            {excluded.toLocaleString('de-DE')} von {entries.length.toLocaleString('de-DE')} Spielern
            aus dieser Liste. Sie erscheinen weiterhin unter „Ø Parse (roh)“ und „Bester Parse“.
          </p>
        ) : (
          <p>Keine Mindestanzahl — jeder gewertete Kill zählt.</p>
        )}
        <p>
          Gewertet wird {parseMetricType === 'DPS' ? 'die Schadenswertung' : 'die Heilungswertung'}.
          Heiler werden auf Heilung gewertet, Tanks und Schadensausteiler auf Schaden; eine
          Schadenswertung für Heiler wäre aussagelos und wird nicht gewertet.
        </p>
      </details>

      <Panel
        title={metric.label}
        subtitle={
          metric.usesMinimumSample
            ? `${qualified.length.toLocaleString('de-DE')} Spieler ab ${minKills} gewerteten Kills` +
              (ranked.length < qualified.length ? ` · Top ${ranked.length} gezeigt` : '')
            : `${qualified.length.toLocaleString('de-DE')} Spieler` +
              (ranked.length < qualified.length ? ` · Top ${ranked.length} gezeigt` : '')
        }
        flush
      >
        <DataTable
          columns={columns}
          rows={ranked}
          rowKey={(row) => row.subject.characterId}
          showRank
          emptyMessage="Keine Parses für diese Filter."
        />
      </Panel>
    </>
  );
}
