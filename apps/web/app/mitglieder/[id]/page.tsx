import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrnateFrame, Panel } from '../../../components/ui/frame';
import { ClassName, Divider, StatBar } from '../../../components/ui/bits';
import { DataTable, type Column } from '../../../components/ui/data-table';
import { AchievementCard } from '../../../components/achievements/card';
import {
  applyPins,
  findAccountForSubject,
  loadAchievementsForSubject,
} from '../../../lib/achievements';
import { loadMember, type MemberCharacter } from '../../../lib/members';
import { formatAmount, formatDuration, formatNumber } from '../../../lib/wow';
import achievementStyles from '../../erfolge/achievements.module.css';

export const revalidate = 900;

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const member = await loadMember(decodeURIComponent(id));
  return { title: member?.name ?? 'Mitglied' };
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div
        style={{
          color: 'var(--text-muted)',
          fontSize: '0.72rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display), Georgia, serif',
          fontSize: '1.45rem',
          color: 'var(--gold-200)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.25,
        }}
      >
        {value}
      </div>
      {hint && <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{hint}</div>}
    </div>
  );
}

const de = (n: number): string => n.toLocaleString('de-DE');

export default async function MemberPage({ params }: { params: Params }) {
  const { id } = await params;
  const member = await loadMember(decodeURIComponent(id));
  if (!member) notFound();

  const [achievements, account] = await Promise.all([
    loadAchievementsForSubject(member.subjectId),
    findAccountForSubject(member.subjectId),
  ]);

  const split = achievements
    ? applyPins(achievements.earned, account?.pinnedAchievements ?? [])
    : { pinned: [], rest: [] };

  const active = member.characters.filter((row) => row.pulls > 0);

  const characterColumns: readonly Column<MemberCharacter>[] = [
    {
      key: 'name',
      header: 'Charakter',
      render: (row) => (
        <a
          href={`/players/${encodeURIComponent(row.name)}?realm=${encodeURIComponent(row.realmName)}`}
        >
          <ClassName name={row.name} className={row.className} />
        </a>
      ),
    },
    { key: 'realm', header: 'Realm', render: (row) => row.realmName },
    { key: 'pulls', header: 'Pulls', numeric: true, render: (row) => de(row.pulls) },
    { key: 'kills', header: 'Bosskills', numeric: true, render: (row) => de(row.kills) },
    {
      key: 'combat',
      header: 'Kampfzeit',
      numeric: true,
      render: (row) => formatDuration(row.combatMs),
    },
    {
      key: 'span',
      header: 'Zeitraum',
      render: (row) =>
        row.firstSeen && row.lastSeen
          ? `${row.firstSeen.toLocaleDateString('de-DE')} – ${row.lastSeen.toLocaleDateString('de-DE')}`
          : '—',
    },
  ];

  const m = member.metrics;

  return (
    <>
      <OrnateFrame
        title={member.name}
        subtitle={
          member.kind === 'person'
            ? `${de(active.length)} Charaktere · alles zusammengerechnet`
            : 'Einzelner Charakter — noch keiner Person zugeordnet'
        }
      >
        <div
          style={{
            display: 'grid',
            gap: '1.1rem 2rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))',
          }}
        >
          <Stat label="Raidabende" value={de(m.nights)} hint={`Streak ${de(m.attendanceStreak)}`} />
          <Stat
            label="Zeit im Raid"
            value={formatDuration(m.raidTimeMs)}
            hint={`${formatDuration(m.combatMs)} Kampf`}
          />
          <Stat label="Pulls" value={de(m.pulls)} hint={`${de(m.wipes)} Wipes`} />
          <Stat label="Bosskills" value={de(m.bossKills)} hint={`${de(m.bossesKilled)} Bosse`} />
          <Stat
            label="Attendance"
            value={`${member.attendancePercent.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`}
            hint={`${de(member.attendedNights)} von ${de(member.availableNights)} Mainraids`}
          />
          <Stat label="Erstkills" value={de(m.firstKills)} hint={`${de(m.heroicKills)} HC-Kills`} />
        </div>

        {member.firstSeen && member.lastSeen && (
          <p style={{ marginBottom: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Erster Pull {member.firstSeen.toLocaleDateString('de-DE')}, letzter{' '}
            {member.lastSeen.toLocaleDateString('de-DE')} · {de(m.expansions)} Erweiterungen,{' '}
            {de(m.zones)} Raids
          </p>
        )}
      </OrnateFrame>

      <Divider label="Charaktere" />

      <Panel
        title="Zusammengerechnet"
        subtitle={
          member.kind === 'person'
            ? `${de(active.length)} Charaktere mit Pulls`
            : 'Beansprucht bisher niemand'
        }
        flush
      >
        <DataTable
          columns={characterColumns}
          rows={active}
          rowKey={(row) => row.id}
          emptyMessage="Keine Pulls aufgezeichnet."
        />
      </Panel>

      <Divider label="Leistung" />

      <Panel title="Über alle Charaktere">
        <div
          style={{
            display: 'grid',
            gap: '1.1rem 2rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))',
          }}
        >
          <Stat label="Schaden" value={formatAmount(m.damageDone)} />
          <Stat label="Heilung" value={formatAmount(m.healingDone)} />
          <Stat label="Erlitten" value={formatAmount(m.damageTaken)} hint="teilweise importiert" />
          <Stat label="Unterbrechungen" value={de(m.interrupts)} />
          <Stat label="Dispels" value={de(m.dispels)} />
          <Stat label="Tode" value={de(m.deaths)} hint={`${de(m.firstDeaths)}× als Erster`} />
        </div>

        <div style={{ marginTop: '1.2rem', display: 'grid', gap: '0.7rem', maxWidth: '34rem' }}>
          {[
            { label: 'Parses ab 75', value: m.parses75 },
            { label: 'Parses ab 95', value: m.parses95 },
            { label: 'Parses ab 99', value: m.parses99 },
            { label: 'Parses 100', value: m.parses100 },
          ].map((row) => (
            <div key={row.label}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  marginBottom: '0.15rem',
                }}
              >
                <span>{row.label}</span>
                <span style={{ color: 'var(--text-muted)' }}>{de(row.value)}</span>
              </div>
              <StatBar value={row.value} max={Math.max(m.parses75, 1)} label="" />
            </div>
          ))}
        </div>
      </Panel>

      {achievements && (
        <>
          <Divider label="Erfolge" />

          {split.pinned.length > 0 && (
            <Panel title="Angepinnt" subtitle="Selbst ausgewählt">
              <div className={achievementStyles.grid}>
                {split.pinned.map((entry) => (
                  <AchievementCard
                    key={entry.definition.id}
                    definition={entry.definition}
                    byTier={entry.byTier}
                    eligible={achievements.eligible}
                    tier={entry.tier}
                    value={entry.value}
                    nextThreshold={entry.nextThreshold}
                  />
                ))}
              </div>
            </Panel>
          )}

          <Panel
            title="Errungen"
            subtitle={`${de(achievements.earned.length)} von ${de(
              achievements.earned.length + achievements.open.length,
            )} · seltenste zuerst`}
          >
            <div className={achievementStyles.grid}>
              {split.rest.map((entry) => (
                <AchievementCard
                  key={entry.definition.id}
                  definition={entry.definition}
                  byTier={entry.byTier}
                  eligible={achievements.eligible}
                  tier={entry.tier}
                  value={entry.value}
                  nextThreshold={entry.nextThreshold}
                />
              ))}
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
