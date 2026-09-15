import type { Metadata } from 'next';
import { OrnateFrame, Panel } from '../../../components/ui/frame';
import {
  ClassName,
  Divider,
  ParseValue,
  SampleSize,
  StatBar,
  TooltipCard,
  TooltipRow,
} from '../../../components/ui/bits';
import { DataTable, type Column } from '../../../components/ui/data-table';
import {
  CLASS_NAMES,
  PARSE_BRACKETS,
  classVar,
  formatAmount,
  formatDuration,
} from '../../../lib/wow';

export const metadata: Metadata = { title: 'Design-System' };

/**
 * Visual reference and readability proof for the Classic UI.
 *
 * The 500-row table at the bottom is the point of this page: it is the honest
 * test of whether a gilded frame survives real leaderboard volume. If this
 * page is hard to read, the design is wrong — not the data.
 */

// Deterministic pseudo-random data, so the page renders identically on every
// request and screenshots stay comparable.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYLLABLES = ['awa', 'von', 'mae', 'san', 'kor', 'thal', 'dre', 'nix', 'bor', 'lyr', 'zur', 'ael'];
const TAILS = ['tone', 'icon', 'xer', 'yo', 'ath', 'ien', 'ok', 'ara', 'us', 'eth'];

interface DemoRow {
  name: string;
  wowClass: string;
  avgParse: number;
  bestParse: number;
  kills: number;
  damage: number;
  deaths: number;
}

function buildRows(count: number): DemoRow[] {
  const rand = mulberry32(20260914);
  const rows: DemoRow[] = [];
  for (let i = 0; i < count; i += 1) {
    const name =
      (SYLLABLES[Math.floor(rand() * SYLLABLES.length)] ?? 'awa') +
      (TAILS[Math.floor(rand() * TAILS.length)] ?? 'tone');
    rows.push({
      name: name.charAt(0).toUpperCase() + name.slice(1) + (i > 120 ? String(i) : ''),
      wowClass: CLASS_NAMES[Math.floor(rand() * CLASS_NAMES.length)] ?? 'Warrior',
      avgParse: Math.min(100, 28 + rand() * 72),
      bestParse: Math.min(100, 60 + rand() * 40),
      kills: 1 + Math.floor(rand() * 280),
      damage: Math.floor(rand() * 9_000_000_000),
      deaths: Math.floor(rand() * 440),
    });
  }
  return rows.sort((a, b) => b.avgParse - a.avgParse);
}

const rows = buildRows(500);

const columns: readonly Column<DemoRow>[] = [
  {
    key: 'name',
    header: 'Spieler',
    render: (row) => <ClassName name={row.name} className={row.wowClass} />,
  },
  { key: 'class', header: 'Klasse', render: (row) => row.wowClass },
  {
    key: 'avg',
    header: 'Ø Parse',
    numeric: true,
    render: (row) => <ParseValue value={row.avgParse} />,
  },
  {
    key: 'best',
    header: 'Bester',
    numeric: true,
    render: (row) => <ParseValue value={row.bestParse} decimals={0} />,
  },
  {
    key: 'kills',
    header: 'Stichprobe',
    numeric: true,
    render: (row) => <SampleSize n={row.kills} />,
  },
  {
    key: 'damage',
    header: 'Schaden',
    numeric: true,
    render: (row) => formatAmount(row.damage),
  },
  { key: 'deaths', header: 'Tode', numeric: true, render: (row) => row.deaths },
];

export default function DesignSystemPage() {
  const top = rows.slice(0, 3);

  return (
    <>
      <h1>Design-System</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '62ch' }}>
        Referenz für den Classic-Look. Alle Ornamente sind in CSS/SVG gezeichnet — es wird kein
        Bildmaterial aus dem Spielclient verwendet. Die Tabelle am Ende hat 500 Zeilen und ist der
        eigentliche Test: der Rahmen darf episch sein, der Inhalt muss lesbar bleiben.
      </p>

      <Divider label="Rahmen" />

      <div
        style={{
          display: 'grid',
          gap: '1.25rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(19rem, 1fr))',
        }}
      >
        <OrnateFrame title="Ornate Frame" subtitle="Schauseiten: Rekorde, Hall of Fame, Profile">
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Goldene Fase, schwarze Fassung, vier Eckbeschläge. Nicht ineinander verschachteln —
            zwei Goldrahmen übereinander wirken unruhig.
          </p>
        </OrnateFrame>

        <Panel title="Panel" subtitle="Arbeitsseiten: Ranglisten, Admin">
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Gleicher Grund, nur eine dünne goldene Linie. Damit bleiben die Daten vorn.
          </p>
        </Panel>
      </div>

      <Divider label="Parse-Farben" />

      <Panel
        title="Item-Qualitätsfarben als Parse-Skala"
        subtitle="Die Konvention von Warcraft Logs, hier als eine Quelle für UI und Erklärtexte"
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem' }}>
          {PARSE_BRACKETS.map((bracket) => (
            <div key={bracket.label} style={{ minWidth: '9rem' }}>
              <div style={{ color: `var(${bracket.cssVar})`, fontWeight: 600 }}>{bracket.label}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                ab {bracket.min}. Perzentil
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Divider label="Klassenfarben" />

      <Panel title="Klassenfarben" subtitle="Blizzards veröffentlichte Werte">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1.4rem' }}>
          {CLASS_NAMES.map((name) => (
            <span key={name} style={{ color: classVar(name) }}>
              {name}
            </span>
          ))}
        </div>
      </Panel>

      <Divider label="Tooltip-Karten" />

      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
        }}
      >
        {top.map((row) => (
          <TooltipCard
            key={row.name}
            title={row.name}
            titleColor={classVar(row.wowClass)}
            meta={`${row.wowClass} · ${row.kills} gewertete Kills`}
          >
            <TooltipRow label="Ø Parse" value={<ParseValue value={row.avgParse} />} />
            <TooltipRow label="Bester Parse" value={<ParseValue value={row.bestParse} decimals={0} />} />
            <TooltipRow label="Schaden gesamt" value={formatAmount(row.damage)} />
            <TooltipRow label="Tode" value={row.deaths} />
          </TooltipCard>
        ))}
      </div>

      <Divider label="Balken" />

      <Panel title="Statusbalken" subtitle="Anmutung einer Health- bzw. Castbar">
        <div style={{ display: 'grid', gap: '0.7rem', maxWidth: '32rem' }}>
          <StatBar value={98.7} max={100} label="Attendance 98,7 %" />
          <StatBar value={273} max={287} color="var(--danger)" label="Wipes 273 / 287 Pulls" />
          <StatBar value={14} max={287} color="var(--ok)" label="Kills 14 / 287 Pulls" />
          <StatBar
            value={277}
            max={600}
            color="var(--q-epic)"
            label={`Längster Raid ${formatDuration(4 * 3600_000 + 37 * 60_000)}`}
          />
        </div>
      </Panel>

      <Divider label="Rangliste — 500 Zeilen" />

      <Panel
        title="Ø Parse — gewertet"
        subtitle="Mindestens 10 gewertete Kills · Stichprobe immer sichtbar"
        flush
      >
        <DataTable columns={columns} rows={rows} rowKey={(row, i) => `${row.name}-${i}`} showRank />
      </Panel>
    </>
  );
}
