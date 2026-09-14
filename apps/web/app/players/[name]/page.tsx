import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrnateFrame, Panel } from '../../../components/ui/frame';
import { ClassName, Divider, ParseValue, SampleSize, StatBar } from '../../../components/ui/bits';
import { DataTable, type Column } from '../../../components/ui/data-table';
import {
  findCharactersByName,
  loadPlayerProfile,
  type DeathCauseLine,
  type EncounterLine,
} from '../../../lib/players';
import { classVar, formatAmount, formatDuration, formatNumber } from '../../../lib/wow';
import { getViewer } from '../../../lib/auth';
import { AchievementCard } from '../../../components/achievements/card';
import {
  applyPins,
  findAccountForSubject,
  loadAchievementsForCharacter,
} from '../../../lib/achievements';
import achievementStyles from '../../erfolge/achievements.module.css';
import styles from '../../leaderboards/leaderboards.module.css';

export const revalidate = 900;

type Params = Promise<{ name: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

const de = (n: number): string => n.toLocaleString('de-DE');
const de2 = (n: number): string =>
  n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { name } = await params;
  return { title: decodeURIComponent(name) };
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

const encounterColumns: readonly Column<EncounterLine>[] = [
  { key: 'boss', header: 'Boss', render: (row) => row.boss },
  { key: 'diff', header: 'Schwierigkeit', render: (row) => row.difficulty ?? '—' },
  { key: 'kills', header: 'Kills', numeric: true, render: (row) => de(row.kills) },
  { key: 'pulls', header: 'Pulls', numeric: true, render: (row) => de(row.pulls) },
  {
    key: 'best',
    header: 'Bester Parse',
    numeric: true,
    render: (row) =>
      row.bestParse === null ? (
        <span style={{ color: 'var(--text-muted)' }}>—</span>
      ) : (
        <ParseValue value={row.bestParse} decimals={0} />
      ),
  },
  {
    key: 'avg',
    header: 'Ø Parse',
    numeric: true,
    render: (row) =>
      row.averageParse === null ? (
        <span style={{ color: 'var(--text-muted)' }}>—</span>
      ) : (
        <ParseValue value={row.averageParse} />
      ),
  },
];

export default async function PlayerProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { name } = await params;
  const search = await searchParams;
  const decoded = decodeURIComponent(name);

  const matches = await findCharactersByName(decoded);
  if (matches.length === 0) notFound();

  // A character name is only unique per realm, so an ambiguous name asks
  // rather than silently picking one.
  const realmParam = search.realm;
  const realm = Array.isArray(realmParam) ? realmParam[0] : realmParam;
  const chosen =
    matches.length === 1
      ? matches[0]
      : matches.find((m) => m.realmName.toLowerCase() === realm?.toLowerCase());

  if (!chosen) {
    return (
      <>
        <h1>{decoded}</h1>
        <p className={styles.intro}>
          Diesen Namen gibt es auf mehreren Realms. Welchen meinst du?
        </p>
        <Panel title="Auswahl">
          <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
            {matches.map((match) => (
              <li key={match.id} style={{ padding: '0.2rem 0' }}>
                <a href={`/players/${encodeURIComponent(match.name)}?realm=${encodeURIComponent(match.realmName)}`}>
                  <ClassName name={match.name} className={match.className} /> — {match.realmName} (
                  {match.region})
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      </>
    );
  }

  // Real names are for signed-in members only. Passing the flag rather than
  // filtering afterwards means an anonymous request never loads the value.
  const viewer = await getViewer();
  const profile = await loadPlayerProfile(chosen.id, viewer !== null);
  if (!profile) notFound();

  const { totals, parses } = profile;
  const deathsPerPull = totals.pulls === 0 ? 0 : totals.deaths / totals.pulls;

  // Achievements are person-wide, so they are looked up through the subject
  // rather than through this one character.
  const achievements = await loadAchievementsForCharacter(chosen.name);
  const account = achievements
    ? await findAccountForSubject(achievements.subject.subjectId)
    : null;
  const split = achievements
    ? applyPins(achievements.earned, account?.pinnedAchievements ?? [])
    : { pinned: [], rest: [] };
  const pinnedAchievements = split.pinned;
  const restAchievements = split.rest;

  const deathColumns: readonly Column<DeathCauseLine>[] = [
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
      <OrnateFrame
        title={
          <>
            <span style={{ color: classVar(profile.className) }}>{profile.name}</span>
            {profile.person && (
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8em' }}>
                {' · '}
                {/* Real name for members, display name for everyone else. */}
                {profile.person.realName ?? profile.person.displayName}
              </span>
            )}
          </>
        }
        subtitle={[
          profile.className,
          profile.mainSpec,
          `${profile.realmName} (${profile.region})`,
          profile.firstSeenAt && profile.lastSeenAt
            ? `${profile.firstSeenAt.toLocaleDateString('de-DE')} – ${profile.lastSeenAt.toLocaleDateString('de-DE')}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      >
        <div
          style={{
            display: 'grid',
            gap: '1.1rem 1.8rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(8.5rem, 1fr))',
          }}
        >
          <Stat label="Raidabende" value={de(totals.raidNights)} />
          <Stat label="Pulls" value={de(totals.pulls)} />
          <Stat
            label="Bosskills"
            value={de(totals.kills)}
            hint={totals.pulls > 0 ? `${de(totals.wipes)} Wipes` : undefined}
          />
          <Stat
            label="Tode"
            value={de(totals.deaths)}
            hint={totals.pulls > 0 ? `${de2(deathsPerPull)} pro Pull` : undefined}
          />
          <Stat label="Kampfzeit" value={formatDuration(totals.combatMs)} />
          <Stat label="Schaden" value={formatAmount(Number(totals.damageDone))} />
          <Stat label="Heilung" value={formatAmount(Number(totals.healingDone))} />
        </div>

        {totals.pulls > 0 && (
          <div style={{ marginTop: '1.2rem', maxWidth: '30rem' }}>
            <StatBar
              value={totals.kills}
              max={totals.pulls}
              color="var(--q-uncommon)"
              label={`${de(totals.kills)} Kills · ${de(totals.wipes)} Wipes`}
            />
          </div>
        )}
      </OrnateFrame>

      {profile.person && (
        <>
          <Divider label="Weitere Charaktere" />
          <Panel
            title={profile.person.displayName}
            subtitle={`${profile.siblings.length + 1} zugeordnete Charaktere`}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1.2rem' }}>
              {profile.siblings.map((sibling) => (
                <a key={sibling.id} href={`/players/${encodeURIComponent(sibling.name)}`}>
                  <ClassName name={sibling.name} className={sibling.className} />
                </a>
              ))}
              {profile.siblings.length === 0 && (
                <span style={{ color: 'var(--text-muted)' }}>Keine weiteren Charaktere.</span>
              )}
            </div>
          </Panel>
        </>
      )}

      {achievements && (
        <>
          <Divider label="Erfolge" />
          {pinnedAchievements.length > 0 && (
            <Panel
              title="Angepinnt"
              subtitle="Selbst ausgewählt"
            >
              <div className={achievementStyles.grid}>
                {pinnedAchievements.map((entry) => (
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
            {achievements.earned.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                Noch nichts errungen. Die Schwellen stehen unter <a href="/erfolge">Erfolge</a>.
              </p>
            ) : (
              <div className={achievementStyles.grid}>
                {restAchievements.slice(0, 9).map((entry) => (
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
            )}
          </Panel>

          {achievements.open.length > 0 && (
            <Panel title="Als Nächstes" subtitle="Am dichtesten an der ersten Stufe">
              <div className={achievementStyles.grid}>
                {achievements.open.slice(0, 3).map((entry) => (
                  <AchievementCard
                    key={entry.definition.id}
                    definition={entry.definition}
                    byTier={entry.byTier}
                    eligible={achievements.eligible}
                    tier={null}
                    value={entry.value}
                    nextThreshold={entry.nextThreshold}
                  />
                ))}
              </div>
            </Panel>
          )}
        </>
      )}

      <Divider label="Parses" />

      {parses.sampleSize === 0 ? (
        <Panel title="Parses">
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Keine gewerteten Kills. Warcraft Logs wertet ausschließlich Kills — wer nur an
            Progressabenden dabei war, erscheint hier nicht.
          </p>
        </Panel>
      ) : (
        <Panel title="Parses" subtitle={`${de(parses.sampleSize)} gewertete Kills`}>
          <div
            style={{
              display: 'grid',
              gap: '1.1rem 1.8rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))',
            }}
          >
            <Stat
              label="Ø bester je Boss"
              value={parses.bestPerBossMean === null ? '—' : formatNumber(parses.bestPerBossMean, 1)}
              hint={`über ${de(parses.bossCount)} Bosse`}
            />
            <Stat label="Bester Parse" value={parses.best === null ? '—' : formatNumber(parses.best)} />
            <Stat label="Parses ab 99" value={de(parses.count99)} />
            <Stat label="Parses ab 95" value={de(parses.count95)} />
          </div>
        </Panel>
      )}

      <Divider label="Bosse" />

      <Panel title="Nach Boss" subtitle="Nach Pulls sortiert" flush>
        <DataTable
          columns={encounterColumns}
          rows={profile.encounters}
          rowKey={(row) => `${row.boss}-${row.difficulty ?? 'x'}`}
          emptyMessage="Keine Boss-Pulls erfasst."
        />
      </Panel>

      {profile.deathCauses.length > 0 && (
        <>
          <Divider label="Todesursachen" />
          <Panel
            title="Woran dieser Charakter stirbt"
            subtitle={
              <>
                {de(totals.deaths)} Tode · nur aus Raidabenden, deren Inhalte Warcraft Logs noch
                vorhält <SampleSize n={profile.deathCauses.length} unit="Ursachen" />
              </>
            }
            flush
          >
            <DataTable
              columns={deathColumns}
              rows={profile.deathCauses}
              rowKey={(row) => row.abilityName ?? 'unbekannt'}
              showRank
              emptyMessage="Keine Todesursachen erfasst."
            />
          </Panel>
        </>
      )}
    </>
  );
}
