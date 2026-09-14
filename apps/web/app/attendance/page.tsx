import type { Metadata } from 'next';
import { OrnateFrame, Panel } from '../../components/ui/frame';
import { ClassName, Divider, StatBar } from '../../components/ui/bits';
import { DataTable, type Column } from '../../components/ui/data-table';
import {
  loadAttendance,
  loadAttendanceOverview,
  loadSizeBuckets,
  type AttendanceRow,
} from '../../lib/attendance';
import { loadSettings } from '../../lib/settings';
import { MAIN_RAID_SIZE, MIN_NIGHTS_FOR_TITLE } from '../../lib/hall-of-fame';
import { formatDuration, formatNumber } from '../../lib/wow';
import styles from '../leaderboards/leaderboards.module.css';

export const metadata: Metadata = { title: 'Attendance' };
export const revalidate = 900;

type Search = Record<string, string | string[] | undefined>;

function one(search: Search, key: string): string | undefined {
  const value = search[key];
  return Array.isArray(value) ? value[0] : value;
}

const SORTS = {
  percent: 'Attendance',
  attended: 'Raidabende',
  hours: 'Raidstunden',
} as const;
type SortKey = keyof typeof SORTS;

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const sortKey: SortKey = (['percent', 'attended', 'hours'] as const).includes(
    one(search, 'sort') as SortKey,
  )
    ? (one(search, 'sort') as SortKey)
    : 'percent';

  const minAvailable = Number(one(search, 'min') ?? MIN_NIGHTS_FOR_TITLE);
  // Main raid by default: of 582 nights only 379 had 20 or more players, and
  // measuring a 25-player raider against alt runs they were never rostered for
  // understates them.
  const sizeRaw = one(search, 'groesse');
  const minRaidSize = sizeRaw === undefined ? MAIN_RAID_SIZE : Number(sizeRaw);

  const [settings, overview, buckets, rows] = await Promise.all([
    loadSettings(),
    loadAttendanceOverview(),
    loadSizeBuckets(),
    loadAttendance({
      minAvailable: Number.isFinite(minAvailable) ? minAvailable : MIN_NIGHTS_FOR_TITLE,
      minRaidSize: Number.isFinite(minRaidSize) ? minRaidSize : MAIN_RAID_SIZE,
    }),
  ]);

  const ranked = [...rows]
    .sort((a, b) => {
      if (sortKey === 'attended') return b.attended - a.attended || b.percent - a.percent;
      if (sortKey === 'hours') return b.activeMs - a.activeMs || b.attended - a.attended;
      return b.percent - a.percent || b.attended - a.attended;
    })
    .slice(0, 150);

  const columns: readonly Column<AttendanceRow>[] = [
    {
      key: 'name',
      header: 'Spieler',
      render: (row) => (
        <a href={`/players/${encodeURIComponent(row.name)}`}>
          <ClassName name={row.name} className={row.className} />
        </a>
      ),
    },
    {
      key: 'percent',
      header: 'Attendance',
      numeric: true,
      render: (row) => (
        <span style={{ color: row.percent >= 90 ? 'var(--q-artifact)' : undefined }}>
          {formatNumber(row.percent, 1)} %
        </span>
      ),
    },
    {
      key: 'attended',
      header: 'Anwesend',
      numeric: true,
      render: (row) => `${formatNumber(row.attended)} / ${formatNumber(row.available)}`,
    },
    {
      key: 'hours',
      header: 'Kampfzeit',
      numeric: true,
      render: (row) => formatDuration(row.activeMs),
    },
    {
      key: 'span',
      header: 'Zeitraum',
      render: (row) =>
        `${row.firstSeen.toLocaleDateString('de-DE')} – ${row.lastSeen.toLocaleDateString('de-DE')}`,
    },
  ];

  return (
    <>
      <OrnateFrame
        title="Attendance"
        subtitle={
          overview.firstNight && overview.lastNight
            ? `${formatNumber(overview.sessions)} Raidabende · ${overview.firstNight.toLocaleDateString('de-DE')} – ${overview.lastNight.toLocaleDateString('de-DE')}`
            : 'Noch keine Raidabende gebildet'
        }
      >
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', maxWidth: '68ch' }}>
          Insgesamt {formatDuration(overview.combatMs)} reine Kampfzeit über{' '}
          {formatNumber(overview.sessions)} Abende. {formatNumber(overview.multiReportSessions)}{' '}
          davon wurden aus mehreren Logs zusammengesetzt.
        </p>
      </OrnateFrame>

      <Panel title="Filter">
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Sortierung</span>
          <div className={styles.filterChips}>
            {(Object.keys(SORTS) as SortKey[]).map((key) => (
              <a
                key={key}
                href={`/attendance?sort=${key}&groesse=${minRaidSize}`}
                className={sortKey === key ? styles.chipActive : styles.chip}
              >
                {SORTS[key]}
              </a>
            ))}
          </div>
        </div>
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Raidgröße</span>
          <div className={styles.filterChips}>
            {buckets.map((bucket) => (
              <a
                key={bucket.minSize}
                href={`/attendance?sort=${sortKey}&groesse=${bucket.minSize}`}
                className={minRaidSize === bucket.minSize ? styles.chipActive : styles.chip}
              >
                {bucket.label} ({formatNumber(bucket.sessions)})
              </a>
            ))}
          </div>
        </div>
      </Panel>

      <Divider label={SORTS[sortKey]} />

      <details className={styles.disclosure}>
        <summary>Wie wird das berechnet?</summary>
        <p>
          Ein <strong>Raidabend</strong> entsteht aus den Kämpfen selbst, nicht aus den Logs: Liegen
          zwischen zwei Pulls mehr als {settings.sessionGapHours} Stunden, beginnt ein neuer Abend.
          Das ist nötig, weil ein Abend oft über mehrere Logs verteilt ist und ein Log manchmal
          tagelang weiterläuft. Die Schwelle ist nicht geraten: {formatNumber(13573)} Pausen
          zwischen Pulls liegen unter 30 Minuten, 576 über 12 Stunden — dazwischen fast nichts.
        </p>
        <p>
          <strong>Anwesend</strong> ist, wer mindestens {settings.attendanceMinMinutes} Minuten
          gekämpft hat <em>oder</em> mindestens{' '}
          {formatNumber(settings.attendanceMinParticipation * 100)} % der Kampfzeit des Abends.
          Zwei Schwellen, weil ein kurzer und ein langer Abend verschiedene Maßstäbe brauchen.
        </p>
        <p>
          Die <strong>Attendance</strong> misst gegen die eigene Zugehörigkeit: gezählt werden nur
          Abende zwischen dem ersten und dem letzten Auftreten eines Spielers. Gegen alle Abende der
          Gildengeschichte zu messen, würde jeden bestrafen, der später dazukam. Beide Gildennamen
          zählen zusammen — eine Umbenennung ist keine Abwesenheit.
        </p>
        <p>
          Die <strong>Raidgröße</strong> entscheidet mit, was als Abend zählt. Von{' '}
          {formatNumber(overview.sessions)} Abenden hatten nur{' '}
          {formatNumber(buckets.find((b) => b.minSize === 20)?.sessions ?? 0)} zwanzig oder mehr
          Spieler; der Rest sind Twink- und Zehnerruns. Einen Stammraider daran zu messen, würde ihn
          für Abende bestrafen, an denen er nie eingeplant war. Voreingestellt ist deshalb der
          Mainraid; „Alle Abende“ zeigt das ungefilterte Bild.
        </p>
        <p>
          Gezeigt werden nur Spieler mit mindestens {formatNumber(minAvailable)} möglichen Abenden;
          bei weniger sagt ein Prozentwert nichts aus.
        </p>
      </details>

      <Panel
        title={SORTS[sortKey]}
        subtitle={`${formatNumber(ranked.length)} von ${formatNumber(rows.length)} Spielern`}
        flush
      >
        <DataTable
          columns={columns}
          rows={ranked}
          rowKey={(row) => row.characterId}
          showRank
          emptyMessage="Noch keine Raidabende gebildet."
        />
      </Panel>

      <Divider label="Spitzenreiter" />

      <Panel title="Die Zuverlässigsten" subtitle="Attendance über die eigene Zugehörigkeit">
        <div style={{ display: 'grid', gap: '0.7rem', maxWidth: '40rem' }}>
          {ranked.slice(0, 8).map((row) => (
            <div key={row.characterId}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  marginBottom: '0.15rem',
                }}
              >
                <ClassName name={row.name} className={row.className} />
                <span style={{ color: 'var(--text-muted)' }}>
                  {formatNumber(row.attended)} von {formatNumber(row.available)} Abenden
                </span>
              </div>
              <StatBar
                value={row.percent}
                max={100}
                color={row.percent >= 90 ? 'var(--q-artifact)' : 'var(--gold-300)'}
                label={`${formatNumber(row.percent, 1)} %`}
              />
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
