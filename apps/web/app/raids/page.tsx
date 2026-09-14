import type { Metadata } from 'next';
import { prisma } from '@ina/db';
import { OrnateFrame, Panel } from '../../components/ui/frame';
import { PAGE_ART, zoneArt } from '../../lib/zone-art';
import { Divider } from '../../components/ui/bits';
import { DataTable, type Column } from '../../components/ui/data-table';

export const metadata: Metadata = { title: 'Raids' };

// Reference data changes only when a sync runs, so there is no reason to hit
// the database on every request.
export const revalidate = 3600;

interface ZoneRow {
  wclZoneId: number;
  name: string;
  bossCount: number;
  difficulties: string[];
  isCompleteRaid: boolean;
}

const columns: readonly Column<ZoneRow>[] = [
  {
    key: 'name',
    header: 'Raid',
    render: (row) => (
      <>
        {row.name}
        {row.isCompleteRaid && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}> · Komplettlauf</span>
        )}
      </>
    ),
  },
  {
    key: 'difficulties',
    header: 'Schwierigkeiten',
    render: (row) =>
      row.difficulties.length > 0 ? (
        row.difficulties.join(' · ')
      ) : (
        <span style={{ color: 'var(--text-muted)' }}>—</span>
      ),
  },
  { key: 'bosses', header: 'Bosse', numeric: true, render: (row) => row.bossCount },
  {
    key: 'id',
    header: 'Zone-ID',
    numeric: true,
    render: (row) => <span style={{ color: 'var(--text-muted)' }}>{row.wclZoneId}</span>,
  },
];

export default async function RaidsPage() {
  const expansions = await prisma.expansion.findMany({
    orderBy: { sortOrder: 'desc' },
    include: {
      zones: {
        orderBy: [{ wclZoneId: 'desc' }],
        include: {
          _count: { select: { encounters: true } },
          difficulties: { include: { difficulty: true } },
        },
      },
    },
  });

  const total = expansions.reduce((sum, e) => sum + e.zones.length, 0);

  return (
    <>
      <OrnateFrame art={PAGE_ART.raids} title="Raids">
      <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '68ch' }}>
        {total} Instanzen aus {expansions.length} Erweiterungen — alles, worin die Gilde je einen
        Pull gemacht hat. Eine neue Classic-Erweiterung erscheint hier von selbst, sobald die
        ersten Logs dazu vorliegen.
      </p>
      </OrnateFrame>
      <p style={{ color: 'var(--text-muted)', maxWidth: '68ch', fontSize: '0.88rem' }}>
        Manche Raids tauchen doppelt auf. Das ist kein Fehler: Warcraft Logs legt für jede
        Neuauflage eine eigene Zone an — Ulduar 1017 kennt nur Normal, Ulduar 1026 zusätzlich
        Heroic. Deshalb steht die Zone-ID mit in der Tabelle.
      </p>

      {expansions.map((expansion) => {
        const rows: ZoneRow[] = expansion.zones
          .map((zone) => ({
            wclZoneId: zone.wclZoneId,
            name: zone.name,
            bossCount: zone._count.encounters,
            difficulties: zone.difficulties.map((zd) => zd.difficulty.name).sort(),
            // Whole-instance speedrun zones; kept, but marked so they are not
            // mistaken for a normal raid with one boss.
            isCompleteRaid: /complete raid/i.test(zone.name),
          }))
          // Actual raids first — the speedrun zones each report a single
          // "encounter" and would otherwise crowd out the real instances.
          .sort(
            (a, b) =>
              Number(a.isCompleteRaid) - Number(b.isCompleteRaid) || b.wclZoneId - a.wclZoneId,
          );

        return (
          <section key={expansion.id}>
            <Divider label={expansion.name} />
            <Panel
              title={expansion.name}
              subtitle={`${rows.length} Instanzen · ${rows.reduce((s, r) => s + r.bossCount, 0)} Bosse`}
              flush
            >
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => String(row.wclZoneId)}
                emptyMessage="Noch keine Instanzen erfasst."
              />
            </Panel>
          </section>
        );
      })}
    </>
  );
}
