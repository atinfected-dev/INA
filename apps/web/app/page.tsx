import { existsSync } from 'node:fs';
import path from 'node:path';
import { Panel } from '../components/ui/frame';
import { ClassName } from '../components/ui/bits';
import { loadLanding } from '../lib/landing';
import { classIconUrl, formatAmount, formatDuration, formatNumber } from '../lib/wow';
import styles from './landing.module.css';

// The underlying data only changes when a sync runs.
export const revalidate = 900;

const de = (n: number): string => n.toLocaleString('de-DE');

/**
 * The Pandaren cloud scroll under the title.
 *
 * One half drawn, mirrored for the other: a hairline flowing into three
 * curling clouds at the centre, the motif that runs through every piece of
 * Pandaria's woodwork.
 */
function CloudScroll() {
  const half =
    'M0 14 H150 c14 0 20-6 26-6 s8 8 16 8 c10 0 12-10 20-10 s10 12 18 12 c9 0 11-8 22-8 c9 0 14 4 20 4';
  return (
    <svg className={styles.scroll} viewBox="0 0 544 28" aria-hidden="true" fill="none">
      <path d={half} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path
        d={half}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        transform="translate(544 0) scale(-1 1)"
      />
      <circle cx="272" cy="14" r="3" fill="currentColor" />
      <circle cx="272" cy="14" r="7" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function honourValue(value: number | null, unit: string): string {
  if (value === null) return '';
  if (unit === 'amount') return formatAmount(value);
  if (unit === 'percentile') return formatNumber(value, 1);
  if (unit === 'percent') return `${formatNumber(value, 1)} %`;
  return de(value);
}

export default async function HomePage() {
  const landing = await loadLanding();
  const { totals, expansions, titles, records, latest } = landing;

  // Optional real key art, used only as the deepest layer if someone drops it in.
  const heroArt = existsSync(path.join(process.cwd(), 'public', 'hero.jpg'));

  const years =
    totals.firstNight && totals.lastNight
      ? (totals.lastNight.getTime() - totals.firstNight.getTime()) / (365.25 * 86_400_000)
      : 0;

  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        {heroArt && <div className={styles.heroArt} style={{ backgroundImage: 'url(/hero.jpg)' }} />}
        <div className={styles.peaksFar} />
        <div className={styles.mistBack} />
        <div className={styles.peaksMid} />
        <div className={styles.mistFront} />
        <div className={styles.peaksNear} />

        <div className={styles.heroInner}>
          <p className={styles.kicker}>
            {totals.firstNight
              ? `Seit ${totals.firstNight.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}`
              : 'Gildenhistorie'}
            {' · '}Wrath bis Pandaria
          </p>
          <h1 id="hero-title" className={styles.title}>
            {landing.guildName}
          </h1>
          <CloudScroll />
          <p className={styles.tagline}>
            {formatNumber(years, 1)} Jahre Raidgeschichte, aus {de(totals.nights)} Abenden
            zusammengesetzt. Jeder Pull, jeder Wipe, jeder Erstkill — nach Personen
            zusammengerechnet, nicht nach Charakteren, und nachvollziehbar bis zur Formel.
          </p>
          <div className={styles.ctaRow}>
            <a href="/mitglieder" className={styles.ctaJade}>
              Mitglieder
            </a>
            <a href="/leaderboards" className={styles.cta}>
              Ranglisten
            </a>
            <a href="/hall-of-fame" className={styles.cta}>
              Hall of Fame
            </a>
          </div>

          <div className={styles.counters}>
            {[
              { value: de(totals.nights), label: 'Raidabende' },
              { value: de(totals.pulls), label: 'Pulls' },
              { value: de(totals.kills), label: 'Bosskills' },
              { value: de(totals.wipes), label: 'Wipes' },
              { value: `${de(Math.floor(totals.combatMs / 3_600_000))} h`, label: 'Kampfzeit' },
              { value: de(totals.raiders), label: 'Raider' },
            ].map((entry) => (
              <div key={entry.label} className={styles.counter}>
                <div className={styles.counterValue}>{entry.value}</div>
                <div className={styles.counterLabel}>{entry.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="journey">
        <div className={styles.sectionHead}>
          <h2 id="journey" className={styles.sectionTitle}>
            Die Reise
          </h2>
          <a href="/raids" className={styles.sectionLink}>
            Alle Raidabende →
          </a>
        </div>
        <div className={styles.journey}>
          {expansions.map((stop) => (
            <article key={stop.slug} className={styles.stop}>
              <h3 className={styles.stopName}>{stop.name}</h3>
              <p className={styles.stopSpan}>
                {stop.from.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })} –{' '}
                {stop.to.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' })}
              </p>
              <div className={styles.stopFacts}>
                <span>
                  <strong>{de(stop.raids)}</strong>Raids
                </span>
                <span>
                  <strong>{de(stop.nights)}</strong>Abende
                </span>
                <span>
                  <strong>{de(stop.kills)}</strong>Kills
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {titles.length > 0 && (
        <section className={styles.section} aria-labelledby="honours">
          <div className={styles.sectionHead}>
            <h2 id="honours" className={styles.sectionTitle}>
              Hall of Fame
            </h2>
            <a href="/hall-of-fame" className={styles.sectionLink}>
              Alle Titel →
            </a>
          </div>
          <div className={styles.honours}>
            {titles.slice(0, 6).map((holder) => (
              <article key={holder.title.title} className={styles.honour}>
                {/* Official class icon from Blizzard's render CDN. */}
                <img
                  className={styles.honourIcon}
                  src={classIconUrl(holder.className)}
                  alt={holder.className ?? ''}
                  width={48}
                  height={48}
                  loading="lazy"
                />
                <div>
                  <h3 className={styles.honourTitle}>{holder.title.title}</h3>
                  <p className={styles.honourHolder}>
                    <a href={`/players/${encodeURIComponent(holder.name ?? '')}`}>
                      <ClassName name={holder.name ?? '—'} className={holder.className} />
                    </a>
                  </p>
                  <p className={styles.honourValue}>
                    {holder.title.subtitle} · {honourValue(holder.value, holder.unit)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {records.length > 0 && (
        <section className={styles.section} aria-labelledby="records">
          <div className={styles.sectionHead}>
            <h2 id="records" className={styles.sectionTitle}>
              Rekorde
            </h2>
            <a href="/records" className={styles.sectionLink}>
              Alle Rekorde →
            </a>
          </div>
          <div className={styles.records}>
            {records.map((record) => (
              <article key={record.key} className={styles.record}>
                <div className={styles.recordValue}>{record.value}</div>
                <div className={styles.recordLabel}>{record.label}</div>
                <div className={styles.recordHolder}>
                  {record.holder && (
                    <ClassName name={record.holder} className={record.holderClass} />
                  )}
                  {record.context && <> · {record.context}</>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {latest && (
        <section className={styles.section} aria-labelledby="latest">
          <div className={styles.sectionHead}>
            <h2 id="latest" className={styles.sectionTitle}>
              Letzter Raidabend
            </h2>
            <span className={styles.sectionLink}>
              {latest.date.toLocaleDateString('de-DE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          <Panel title={latest.zone ?? 'Raidabend'} subtitle={`${de(latest.raiders)} Raider`}>
            <div className={styles.latest}>
              <div>
                <div className={styles.counterValue}>{formatDuration(latest.combatMs)}</div>
                <div className={styles.counterLabel}>Kampfzeit</div>
              </div>
              <div>
                <div className={styles.counterValue}>{de(latest.pulls)}</div>
                <div className={styles.counterLabel}>Pulls</div>
              </div>
              <div>
                <div className={styles.counterValue}>{de(latest.kills.length)}</div>
                <div className={styles.counterLabel}>Kills</div>
              </div>
            </div>
            {latest.kills.length > 0 && (
              <ul className={styles.killList} style={{ marginTop: '1rem' }}>
                {latest.kills.map((kill, index) => (
                  <li key={`${kill.boss}-${index}`} className={styles.kill}>
                    {kill.boss}
                    {kill.difficulty ? ` · ${kill.difficulty}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>
      )}
    </>
  );
}
