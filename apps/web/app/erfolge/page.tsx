import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ACHIEVEMENT_CATEGORIES,
  UNAWARDED_ACHIEVEMENTS,
  type AchievementCategory,
} from '@ina/core';
import { OrnateFrame, Panel } from '../../components/ui/frame';
import { PAGE_ART, zoneArt } from '../../lib/zone-art';
import { Divider } from '../../components/ui/bits';
import { AchievementCard } from '../../components/achievements/card';
import { RARITY_MIN_NIGHTS, loadAchievementOverview } from '../../lib/achievements';
import { formatNumber } from '../../lib/wow';
import { getViewer } from '../../lib/auth';
import styles from './achievements.module.css';
import leaderboard from '../leaderboards/leaderboards.module.css';

export const metadata: Metadata = { title: 'Erfolge' };
export const revalidate = 900;

const ORDER: AchievementCategory[] = [
  'lifetime',
  'progress',
  'performance',
  'reliability',
  'fun',
];

export default async function AchievementsPage() {
  // Officers only. Hiding the link would not be access control — anyone can
  // type a URL — so the page checks for itself. Members see the achievements
  // that concern them on their own profile.
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();

  const overview = await loadAchievementOverview();

  return (
    <>
      <OrnateFrame
        art={PAGE_ART.achievements}
        title="Erfolge"
        subtitle={`${formatNumber(overview.standings.length)} Auszeichnungen · ${formatNumber(overview.eligible)} gewertete Raider`}
      >
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', maxWidth: '68ch' }}>
          Erfolge zählen <strong>pro Person</strong>, nicht pro Charakter. Wer einen Krieger in
          Wrath und einen Mönch in Pandaria gespielt hat, ist ein Raider mit einer Geschichte —
          vorausgesetzt, die Charaktere sind einer Person zugeordnet. Nicht zugeordnete Charaktere
          zählen für sich allein.
        </p>
      </OrnateFrame>

      <details className={leaderboard.disclosure}>
        <summary>Wie wird das berechnet?</summary>
        <p>
          Jeder Erfolg ist eine <strong>Schwelle auf einer Kennzahl</strong>, keine eigene Abfrage.
          Die Stufen stehen auf jeder Karte im Klartext — was fehlt, um die nächste zu erreichen,
          ist damit immer ablesbar.
        </p>
        <p>
          <strong>Seltenheit</strong> misst gegen Raider mit mindestens{' '}
          {formatNumber(RARITY_MIN_NIGHTS)} Raidabenden — dieselbe Schwelle, ab der die Hall of Fame
          jemanden als Gildenmitglied zählt. Von {formatNumber(overview.subjects)} Charakteren und
          Personen in der Datenbank erfüllen das {formatNumber(overview.eligible)}. Gegen alle zu
          messen würde jeden Erfolg als „legendär" ausweisen, weil die Datenbank voller Fremder und
          Ein-Abend-Twinks steckt.
        </p>
        <p>
          Zwei Einschränkungen stecken in den Daten selbst:{' '}
          <strong>Todesbezogene Erfolge</strong> zählen nur Raidabende, deren Logs Warcraft Logs
          noch ausliefert — sonst läse sich ein archiviertes Jahr als makellos überlebt.{' '}
          <strong>Erlittener Schaden</strong> gibt es aus demselben Grund nur für nicht
          archivierte Logs — 360 der 716 Reports hält Warcraft Logs nicht mehr vor — und er
          klammert gescriptete Sofort-Tode aus.
        </p>
      </details>

      {ORDER.map((category) => {
        const entries = overview.standings.filter(
          (entry) => entry.definition.category === category,
        );
        if (entries.length === 0) return null;

        return (
          <section key={category}>
            <Divider label={ACHIEVEMENT_CATEGORIES[category].label} />
            <Panel
              title={ACHIEVEMENT_CATEGORIES[category].label}
              subtitle={ACHIEVEMENT_CATEGORIES[category].description}
            >
              <div className={styles.grid}>
                {entries.map((entry) => (
                  <AchievementCard
                    key={entry.definition.id}
                    definition={entry.definition}
                    byTier={entry.byTier}
                    eligible={overview.eligible}
                  />
                ))}
              </div>
            </Panel>
          </section>
        );
      })}

      <Divider label="Nicht vergeben" />

      <Panel
        title="Was es (noch) nicht gibt"
        subtitle="Vorgeschlagen, aber nicht vergeben — mit Begründung"
      >
        {UNAWARDED_ACHIEVEMENTS.map((entry) => (
          <div key={entry.name} className={styles.unavailable}>
            <strong>{entry.name}</strong>
            <p>{entry.reason}</p>
          </div>
        ))}
      </Panel>
    </>
  );
}
