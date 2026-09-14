import type { Metadata } from 'next';
import { Panel } from '../../components/ui/frame';
import { ClassName, Divider, SampleSize } from '../../components/ui/bits';
import { DataTable, type Column } from '../../components/ui/data-table';
import { loadFilterOptions } from '../../lib/leaderboards';
import { loadDeathCauses, loadDeathCoverage, loadDeathLeaderboard, type DeathRow } from '../../lib/deaths';
import { formatDuration } from '../../lib/wow';
import styles from '../leaderboards/leaderboards.module.css';

export const metadata: Metadata = { title: 'Tode' };
export const revalidate = 900;

type Search = Record<string, string | string[] | undefined>;

const MIN_PULLS = 200;

const SORTS = {
  total: { label: 'Tode gesamt', formula: 'Anzahl aller Todesereignisse.', normalised: false },
  perPull: {
    label: 'Tode pro Pull',
    formula:
      'Anzahl Tode geteilt durch die Anzahl der Pulls, an denen der Spieler teilgenommen hat.',
    normalised: true,
  },
  perHour: {
    label: 'Tode pro Stunde',
    formula: 'Anzahl Tode geteilt durch die summierte Kampfzeit in Stunden.',
    normalised: true,
  },
} as const;

type SortKey = keyof typeof SORTS;

function one(search: Search, key: string): string | undefined {
  const value = search[key];
  return Array.isArray(value) ? value[0] : value;
}

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
  return query === '' ? '/deaths' : `/deaths?${query}`;
}

function Chips({
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

const de = (n: number): string => n.toLocaleString('de-DE');
const de2 = (n: number): string =>
  n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function DeathsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;

  const sortKey: SortKey = (['total', 'perPull', 'perHour'] as const).includes(
    one(search, 'sort') as SortKey,
  )
    ? (one(search, 'sort') as SortKey)
    : 'total';
  const sort = SORTS[sortKey];

  const expansionRaw = one(search, 'expansion');
  const expansionId = expansionRaw ? Number(expansionRaw) : undefined;

  const [options, coverage, causes, rows] = await Promise.all([
    loadFilterOptions(),
    loadDeathCoverage(),
    loadDeathCauses(expansionId === undefined ? {} : { expansionId }),
    loadDeathLeaderboard({
      ...(expansionId === undefined ? {} : { expansionId }),
      // A rate over a handful of pulls says nothing; the totals list has no
      // threshold because a raw count needs none.
      minPulls: sort.normalised ? MIN_PULLS : 1,
    }),
  ]);

  const ranked = [...rows]
    .sort((a, b) => {
      if (sortKey === 'perPull') return b.deathsPerPull - a.deathsPerPull || b.pulls - a.pulls;
      if (sortKey === 'perHour') return b.deathsPerHour - a.deathsPerHour || b.pulls - a.pulls;
      return b.deaths - a.deaths || b.pulls - a.pulls;
    })
    .slice(0, 100);

  const columns: readonly Column<DeathRow>[] = [
    {
      key: 'name',
      header: 'Spieler',
      render: (row) => <ClassName name={row.name} className={row.className} />,
    },
    { key: 'class', header: 'Klasse', render: (row) => row.className ?? '—' },
    {
      key: 'deaths',
      header: 'Tode',
      numeric: true,
      render: (row) => <span style={{ color: 'var(--danger)' }}>{de(row.deaths)}</span>,
    },
    { key: 'perPull', header: 'pro Pull', numeric: true, render: (row) => de2(row.deathsPerPull) },
    { key: 'perHour', header: 'pro Stunde', numeric: true, render: (row) => de2(row.deathsPerHour) },
    {
      key: 'pulls',
      header: 'Pulls',
      numeric: true,
      render: (row) => <SampleSize n={row.pulls} unit="Pulls" />,
    },
    {
      key: 'time',
      header: 'Kampfzeit',
      numeric: true,
      render: (row) => formatDuration(row.activeMs),
    },
  ];

  const causeColumns: readonly Column<{ abilityName: string | null; deaths: number }>[] = [
    {
      key: 'ability',
      header: 'Fähigkeit',
      render: (row) =>
        row.abilityName ?? <span style={{ color: 'var(--text-muted)' }}>unbekannt</span>,
    },
    {
      key: 'deaths',
      header: 'Tode',
      numeric: true,
      render: (row) => <span style={{ color: 'var(--danger)' }}>{de(row.deaths)}</span>,
    },
  ];

  return (
    <>
      <h1>Tode</h1>
      <p className={styles.intro}>
        {de(coverage.deaths)} Todesereignisse aus {de(coverage.reportsWithContents)} Raidabenden.
      </p>

      <Panel title="Filter">
        <Chips
          label="Wertung"
          param="sort"
          active={sortKey}
          search={search}
          allowAll={false}
          options={(Object.keys(SORTS) as SortKey[]).map((key) => ({
            value: key,
            label: SORTS[key].label,
          }))}
        />
        <Chips
          label="Erweiterung"
          param="expansion"
          active={expansionId === undefined ? undefined : String(expansionId)}
          search={search}
          options={options.expansions.map((e) => ({ value: String(e.id), label: e.name }))}
        />
      </Panel>

      <Divider label={sort.label} />

      <details className={styles.disclosure}>
        <summary>Wie wird das berechnet?</summary>
        <p>{sort.formula}</p>
        {sort.normalised && (
          <p>
            Mindestens <strong>{MIN_PULLS} Pulls</strong>, sonst sagt eine Quote nichts aus.
          </p>
        )}
        {/*
          The honest caveat. Without it, "deaths per pull" silently flatters
          anyone whose raiding happened in the archived years.
        */}
        <p>
          Warcraft Logs archiviert Reportinhalte nach etwa zwei Jahren.{' '}
          {de(coverage.reportsArchived)} Raidabende — im Wesentlichen die gesamte
          WotLK-Zeit — liefern deshalb keine Todesdaten mehr. Tode <em>und</em> Pulls werden
          ausschließlich über dieselben, noch verfügbaren Raidabende gezählt, damit die Quoten
          nicht zugunsten langjähriger Raider verzerrt sind.
        </p>
        <p>
          Bei {de(coverage.withoutCause)} von {de(coverage.deaths)} Toden nennt das Log keine
          eindeutige Fähigkeit. Diese stehen als „unbekannt“ — es wird nichts geraten.
        </p>
      </details>

      <Panel
        title={sort.label}
        subtitle={`${de(ranked.length)} von ${de(rows.length)} Spielern${sort.normalised ? ` · ab ${MIN_PULLS} Pulls` : ''}`}
        flush
      >
        <DataTable
          columns={columns}
          rows={ranked}
          rowKey={(row) => row.characterId}
          showRank
          emptyMessage="Keine Todesdaten für diese Filter."
        />
      </Panel>

      <Divider label="Häufigste Todesursachen" />

      <Panel title="Womit die Gilde stirbt" subtitle="Über alle verfügbaren Raidabende" flush>
        <DataTable
          columns={causeColumns}
          rows={causes}
          rowKey={(row) => row.abilityName ?? 'unbekannt'}
          showRank
          emptyMessage="Keine Todesursachen erfasst."
        />
      </Panel>
    </>
  );
}
