import type { Metadata } from 'next';
import { OrnateFrame, Panel } from '../../components/ui/frame';
import { PAGE_ART, zoneArt } from '../../lib/zone-art';
import { ClassName } from '../../components/ui/bits';
import { DataTable, type Column } from '../../components/ui/data-table';
import { loadPlayerIndex, type PlayerIndexRow } from '../../lib/players';
import styles from '../leaderboards/leaderboards.module.css';

export const metadata: Metadata = { title: 'Spieler' };
export const revalidate = 900;

type Search = Record<string, string | string[] | undefined>;

const de = (n: number): string => n.toLocaleString('de-DE');

function one(search: Search, key: string): string | undefined {
  const value = search[key];
  return Array.isArray(value) ? value[0] : value;
}

const MIN_PULLS_DEFAULT = 50;

export default async function PlayersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const query = (one(search, 'q') ?? '').trim().toLowerCase();
  const showAll = one(search, 'alle') === '1';

  const all = await loadPlayerIndex();

  // Guild logs record everyone who ever joined a raid, including one-off
  // fill-ins. Without a floor the list is mostly strangers, so the default
  // shows regulars and the full list stays one click away.
  const filtered = all.filter((row) => {
    if (query !== '') return row.name.toLowerCase().includes(query);
    return showAll || row.pulls >= MIN_PULLS_DEFAULT;
  });

  const columns: readonly Column<PlayerIndexRow>[] = [
    {
      key: 'name',
      header: 'Charakter',
      render: (row) => (
        <a href={`/players/${encodeURIComponent(row.name)}`}>
          <ClassName name={row.name} className={row.className} />
        </a>
      ),
    },
    { key: 'class', header: 'Klasse', render: (row) => row.className ?? '—' },
    { key: 'realm', header: 'Realm', render: (row) => row.realmName },
    { key: 'nights', header: 'Raidabende', numeric: true, render: (row) => de(row.raidNights) },
    { key: 'pulls', header: 'Pulls', numeric: true, render: (row) => de(row.pulls) },
    { key: 'kills', header: 'Kills', numeric: true, render: (row) => de(row.kills) },
    {
      key: 'last',
      header: 'Zuletzt',
      render: (row) => (row.lastSeenAt ? row.lastSeenAt.toLocaleDateString('de-DE') : '—'),
    },
  ];

  return (
    <>
      <OrnateFrame art={PAGE_ART.players} title="Spieler">
        <p className={styles.intro} style={{ margin: 0 }}>
          {de(all.length)} Charaktere haben mindestens einen Boss-Pull in den importierten Logs.
        </p>
      </OrnateFrame>

      <Panel title="Suche">
        <form method="get" action="/players" className={styles.filterRow}>
          <span className={styles.filterLabel}>Charaktername</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="z. B. Aventhiah"
            className={styles.search}
          />
          <button type="submit" className={styles.chipActive}>
            Suchen
          </button>
          {query === '' && (
            <a href={showAll ? '/players' : '/players?alle=1'} className={styles.chip}>
              {showAll ? `Nur ab ${MIN_PULLS_DEFAULT} Pulls` : 'Alle anzeigen'}
            </a>
          )}
        </form>
      </Panel>

      <div style={{ height: '1rem' }} />

      <Panel
        title="Charaktere"
        subtitle={
          query !== ''
            ? `${de(filtered.length)} Treffer für „${query}“`
            : showAll
              ? `${de(filtered.length)} Charaktere`
              : `${de(filtered.length)} Charaktere ab ${MIN_PULLS_DEFAULT} Pulls`
        }
        flush
      >
        <DataTable
          columns={columns}
          rows={filtered.slice(0, 300)}
          rowKey={(row) => row.characterId}
          emptyMessage="Keine Charaktere gefunden."
        />
      </Panel>
    </>
  );
}
