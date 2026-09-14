import { prisma } from '@ina/db';
import { OrnateFrame, Panel } from '../components/ui/frame';
import { Divider, StatBar } from '../components/ui/bits';
import { DataTable, type Column } from '../components/ui/data-table';

// The underlying data only changes when a sync runs.
export const revalidate = 900;

interface ExpansionRow {
  name: string;
  reports: number;
  pulls: number;
  kills: number;
  from: Date;
  to: Date;
}

interface BossRow {
  boss: string;
  difficulty: string;
  pulls: number;
  kills: number;
  wipes: number;
}

const expansionColumns: readonly Column<ExpansionRow>[] = [
  { key: 'name', header: 'Erweiterung', render: (row) => row.name },
  {
    key: 'range',
    header: 'Zeitraum',
    render: (row) =>
      `${row.from.toLocaleDateString('de-DE')} – ${row.to.toLocaleDateString('de-DE')}`,
  },
  { key: 'reports', header: 'Raidabende', numeric: true, render: (row) => de(row.reports) },
  { key: 'pulls', header: 'Pulls', numeric: true, render: (row) => de(row.pulls) },
  { key: 'kills', header: 'Kills', numeric: true, render: (row) => de(row.kills) },
];

const bossColumns: readonly Column<BossRow>[] = [
  { key: 'boss', header: 'Boss', render: (row) => row.boss },
  { key: 'diff', header: 'Schwierigkeit', render: (row) => row.difficulty },
  { key: 'pulls', header: 'Pulls', numeric: true, render: (row) => de(row.pulls) },
  { key: 'kills', header: 'Kills', numeric: true, render: (row) => de(row.kills) },
  {
    key: 'wipes',
    header: 'Wipes',
    numeric: true,
    render: (row) => <span style={{ color: 'var(--danger)' }}>{de(row.wipes)}</span>,
  },
  {
    key: 'rate',
    header: 'Erfolgsquote',
    numeric: true,
    render: (row) => dePercent((row.kills / row.pulls) * 100),
  },
];

const de = (n: number): string => n.toLocaleString('de-DE');
const dePercent = (n: number): string =>
  `${n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display), Georgia, serif',
          fontSize: '1.8rem',
          color: 'var(--gold-200)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      {hint && <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{hint}</div>}
    </div>
  );
}

export default async function HomePage() {
  const [guilds, totals, killCount, characters, span, expansionRows, bossRows] = await Promise.all([
    prisma.guild.findMany({ orderBy: { name: 'asc' }, select: { name: true, faction: true } }),
    prisma.fight.count(),
    prisma.fight.count({ where: { kill: true } }),
    prisma.character.count(),
    prisma.report.aggregate({ _min: { startTime: true }, _max: { startTime: true }, _count: true }),
    prisma.$queryRaw<
      { name: string; reports: bigint; pulls: bigint; kills: bigint; from: Date; to: Date }[]
    >`
      SELECT e.name,
             COUNT(DISTINCT r.id) AS reports,
             COUNT(f.id)          AS pulls,
             COUNT(f.id) FILTER (WHERE f.kill) AS kills,
             MIN(r."startTime")   AS "from",
             MAX(r."startTime")   AS "to"
      FROM "Report" r
      JOIN "Fight" f      ON f."reportId" = r.id
      JOIN "Zone" z       ON z.id = r."zoneId"
      JOIN "Expansion" e  ON e.id = z."expansionId"
      GROUP BY e.name, e."sortOrder"
      ORDER BY e."sortOrder"
    `,
    prisma.$queryRaw<
      { boss: string; difficulty: string | null; pulls: bigint; kills: bigint; wipes: bigint }[]
    >`
      SELECT e.name AS boss,
             d.name AS difficulty,
             COUNT(*) AS pulls,
             COUNT(*) FILTER (WHERE f.kill)     AS kills,
             COUNT(*) FILTER (WHERE NOT f.kill) AS wipes
      FROM "Fight" f
      JOIN "Encounter" e       ON e.id = f."encounterId"
      LEFT JOIN "Difficulty" d ON d.id = f."difficultyId"
      GROUP BY e.name, d.name
      ORDER BY wipes DESC
      LIMIT 10
    `,
  ]);

  const wipeCount = totals - killCount;
  const expansions: ExpansionRow[] = expansionRows.map((row) => ({
    name: row.name,
    reports: Number(row.reports),
    pulls: Number(row.pulls),
    kills: Number(row.kills),
    from: row.from,
    to: row.to,
  }));
  const bosses: BossRow[] = bossRows.map((row) => ({
    boss: row.boss,
    difficulty: row.difficulty ?? '—',
    pulls: Number(row.pulls),
    kills: Number(row.kills),
    wipes: Number(row.wipes),
  }));

  const first = span._min.startTime;
  const last = span._max.startTime;
  const years =
    first && last
      ? ((last.getTime() - first.getTime()) / (365.25 * 86_400_000)).toLocaleString('de-DE', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : '0';

  return (
    <>
      <OrnateFrame
        title={guilds.map((g) => g.name).join(' · ') || 'INA Analytics'}
        subtitle={
          first && last
            ? `${first.toLocaleDateString('de-DE')} bis ${last.toLocaleDateString('de-DE')} · ${years} Jahre Gildenhistorie`
            : 'Noch keine Daten importiert'
        }
      >
        <div
          style={{
            display: 'grid',
            gap: '1.25rem 2rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))',
          }}
        >
          <Stat label="Raidabende" value={de(span._count)} />
          <Stat label="Pulls" value={de(totals)} />
          <Stat
            label="Bosskills"
            value={de(killCount)}
            hint={`${dePercent((killCount / totals) * 100)} Erfolgsquote`}
          />
          <Stat label="Wipes" value={de(wipeCount)} />
          <Stat label="Charaktere" value={de(characters)} />
        </div>

        <div style={{ marginTop: '1.4rem', maxWidth: '34rem' }}>
          <StatBar
            value={killCount}
            max={totals}
            color="var(--q-uncommon)"
            label={`${de(killCount)} Kills · ${de(wipeCount)} Wipes`}
          />
        </div>
      </OrnateFrame>

      <Divider label="Nach Erweiterung" />

      <Panel
        title="Gildenhistorie"
        subtitle="Aus den Logs beider Gildennamen zusammengeführt"
        flush
      >
        <DataTable
          columns={expansionColumns}
          rows={expansions}
          rowKey={(row) => row.name}
          emptyMessage="Noch nichts importiert."
        />
      </Panel>

      <Divider label="Hall of Shame" />

      <Panel
        title="Meist gewipte Bosse"
        subtitle="Pulls ohne Kill, über die gesamte Historie"
        flush
      >
        <DataTable
          columns={bossColumns}
          rows={bosses}
          rowKey={(row) => `${row.boss}-${row.difficulty}`}
          showRank
          emptyMessage="Noch nichts importiert."
        />
      </Panel>
    </>
  );
}
