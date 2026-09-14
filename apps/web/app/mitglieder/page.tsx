import type { Metadata } from 'next';
import { OrnateFrame, Panel } from '../../components/ui/frame';
import { ClassName, Divider } from '../../components/ui/bits';
import { DataTable, type Column } from '../../components/ui/data-table';
import { MEMBER_MIN_NIGHTS, loadMembers, type MemberRow } from '../../lib/members';
import { formatDuration, formatNumber } from '../../lib/wow';
import styles from '../leaderboards/leaderboards.module.css';

export const metadata: Metadata = { title: 'Gildenmitglieder' };
export const revalidate = 900;

type Search = Record<string, string | string[] | undefined>;

function one(search: Search, key: string): string | undefined {
  const value = search[key];
  return Array.isArray(value) ? value[0] : value;
}

const THRESHOLDS = [
  { nights: MEMBER_MIN_NIGHTS, label: `ab ${MEMBER_MIN_NIGHTS} Abenden` },
  { nights: 5, label: 'ab 5 Abenden' },
  { nights: 1, label: 'jeder mit einem Abend' },
];

export default async function MembersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const raw = Number(one(search, 'abende'));
  const minNights = THRESHOLDS.some((entry) => entry.nights === raw) ? raw : MEMBER_MIN_NIGHTS;

  const { members, total } = await loadMembers(minNights);

  const columns: readonly Column<MemberRow>[] = [
    {
      key: 'name',
      header: 'Mitglied',
      render: (row) => (
        <a href={`/mitglieder/${encodeURIComponent(row.subjectId)}`}>
          <ClassName name={row.name} className={row.className} />
        </a>
      ),
    },
    {
      key: 'characters',
      header: 'Chars',
      numeric: true,
      render: (row) =>
        row.kind === 'person' ? (
          <span style={{ color: 'var(--gold-300)' }}>{formatNumber(row.characters)}</span>
        ) : (
          formatNumber(row.characters)
        ),
    },
    {
      key: 'nights',
      header: 'Abende',
      numeric: true,
      render: (row) => formatNumber(row.metrics.nights),
    },
    {
      key: 'raidTime',
      header: 'Zeit im Raid',
      numeric: true,
      render: (row) => formatDuration(row.metrics.raidTimeMs),
    },
    {
      key: 'pulls',
      header: 'Pulls',
      numeric: true,
      render: (row) => formatNumber(row.metrics.pulls),
    },
    {
      key: 'kills',
      header: 'Bosskills',
      numeric: true,
      render: (row) => formatNumber(row.metrics.bossKills),
    },
    {
      key: 'expansions',
      header: 'Erw.',
      numeric: true,
      render: (row) => formatNumber(row.metrics.expansions),
    },
  ];

  return (
    <>
      <OrnateFrame
        title="Gildenmitglieder"
        subtitle={`${formatNumber(members.length)} Mitglieder · alles über alle Charaktere zusammengerechnet`}
      >
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', maxWidth: '68ch' }}>
          Ein Mitglied ist eine <strong>Person</strong>, kein Charakter. Wo Charaktere einer Person
          zugeordnet sind, zählen ihre Pulls, Kills und Stunden zusammen — ein Raider mit einer
          Geschichte, egal wie viele Twinks. Nicht zugeordnete Charaktere stehen für sich, bis
          jemand sie beansprucht.
        </p>
      </OrnateFrame>

      <Panel title="Filter">
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Mindestens</span>
          <div className={styles.filterChips}>
            {THRESHOLDS.map((entry) => (
              <a
                key={entry.nights}
                href={`/mitglieder?abende=${entry.nights}`}
                className={minNights === entry.nights ? styles.chipActive : styles.chip}
              >
                {entry.label}
              </a>
            ))}
          </div>
        </div>
      </Panel>

      <details className={styles.disclosure}>
        <summary>Wer steht hier?</summary>
        <p>
          Die Datenbank kennt {formatNumber(total)} Charaktere und Personen — die allermeisten davon
          sind Fremde aus Pugs und Ein-Abend-Twinks, die Warcraft Logs neben dem Raid gesehen hat.
          Voreingestellt sind deshalb Mitglieder mit mindestens {formatNumber(MEMBER_MIN_NIGHTS)}{' '}
          Raidabenden; die anderen Schwellen zeigen das ungefilterte Bild.
        </p>
        <p>
          <strong>Zeit im Raid</strong> ist vom ersten bis zum letzten Pull jedes Abends gerechnet,
          nicht die reine Kampfzeit — das ist die Zahl, die sich für einen Abend richtig anfühlt.
        </p>
      </details>

      <Divider label="Mitglieder" />

      <Panel title="Nach Raidabenden" subtitle={`${formatNumber(members.length)} Mitglieder`} flush>
        <DataTable
          columns={columns}
          rows={members}
          rowKey={(row) => row.subjectId}
          showRank
          emptyMessage="Niemand erfüllt diese Schwelle."
        />
      </Panel>
    </>
  );
}
