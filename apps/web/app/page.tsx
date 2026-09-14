import { existsSync } from 'node:fs';
import path from 'node:path';
import { ClassName } from '../components/ui/bits';
import { loadLanding } from '../lib/landing';
import { HERO_ART, HONOURS_ART, expansionArt, zoneArt } from '../lib/zone-art';
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

const monthYear = (date: Date): string =>
  date.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });

export default async function HomePage() {
  const landing = await loadLanding();
  const { totals, expansions, titles, records, latest, raids } = landing;

  // A local painting in public/hero.jpg wins over the CDN one, if anyone ever
  // wants to swap it without touching code.
  const heroArt = existsSync(path.join(process.cwd(), 'public', 'hero.jpg'))
    ? '/hero.jpg'
    : HERO_ART;

  const years =
    totals.firstNight && totals.lastNight
      ? (totals.lastNight.getTime() - totals.firstNight.getTime()) / (365.25 * 86_400_000)
      : 0;

  const latestArt = latest?.zoneSlug ? zoneArt(latest.zoneSlug, 'large') : null;

  // Only raids Blizzard has a painting for. The two without one — heroic
  // dungeons and challenge modes — are not raids, and an empty dark tile
  // between Ulduar and Icecrown would only raise the question why.
  const paintedRaids = raids.filter((raid) => zoneArt(raid.slug) !== null);

  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroArt} style={{ backgroundImage: `url(${heroArt})` }} />
        <div className={styles.heroWash} />
        <div className={styles.mistBack} />
        <div className={styles.mistFront} />

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
            {de(Math.round(years))} Jahre Raidgeschichte, aus {de(totals.nights)} Abenden
            zusammengesetzt. Jeder Pull, jeder Wipe, jeder Erstkill.
            <br />
            Registriert euch und beansprucht eure Charaktere, um Erfolge zu erhalten oder in der
            Hall of Fame zu landen.
          </p>
          <div className={styles.ctaRow}>
            <a href="/registrieren" className={styles.ctaJade}>
              Registrieren
            </a>
            <a href="/mitglieder" className={styles.cta}>
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
          <span className={styles.sectionLink}>
            {de(expansions.length)} Erweiterungen · {de(paintedRaids.length)} Raids
          </span>
        </div>
        <div className={styles.journey}>
          {expansions.map((stop) => {
            const art = expansionArt(stop.slug, 'small');
            return (
              <article key={stop.slug} className={styles.chapter}>
                {art && (
                  <div className={styles.chapterArt} style={{ backgroundImage: `url(${art})` }} />
                )}
                <div className={styles.chapterWash} />
                <div className={styles.chapterBody}>
                  <h3 className={styles.chapterName}>{stop.name}</h3>
                  <p className={styles.chapterSpan}>
                    {monthYear(stop.from)} – {monthYear(stop.to)}
                  </p>
                  <div className={styles.chapterFacts}>
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
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="raids">
        <div className={styles.sectionHead}>
          <h2 id="raids" className={styles.sectionTitle}>
            Die Schlachtzüge
          </h2>
          <a href="/raids" className={styles.sectionLink}>
            Alle Raidabende →
          </a>
        </div>
        <div className={styles.tiles}>
          {paintedRaids.map((raid) => {
            const art = zoneArt(raid.slug, 'small');
            return (
              <a key={raid.slug} href="/raids" className={styles.tile}>
                <div className={styles.tileArt} style={{ backgroundImage: `url(${art})` }} />
                <div className={styles.tileWash} />
                <div className={styles.tileBody}>
                  <div className={styles.tileKicker}>{raid.expansion}</div>
                  <h3 className={styles.tileName}>{raid.name}</h3>
                  <div className={styles.tileFacts}>
                    {de(raid.pulls)} Pulls · {de(raid.kills)} Kills ·{' '}
                    {raid.from.toLocaleDateString('de-DE', { year: 'numeric' })}
                    {raid.to.getFullYear() !== raid.from.getFullYear() &&
                      `–${raid.to.toLocaleDateString('de-DE', { year: '2-digit' })}`}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {titles.length > 0 && (
        <section className={styles.honoursBand} aria-labelledby="honours">
          <div className={styles.honoursArt} style={{ backgroundImage: `url(${HONOURS_ART})` }} />
          <div className={styles.honoursWash} />
          <div className={styles.bandInner}>
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
            <a href="/raids" className={styles.sectionLink}>
              Alle Abende →
            </a>
          </div>
          <article className={styles.latestCard}>
            {latestArt && (
              <div className={styles.latestArt} style={{ backgroundImage: `url(${latestArt})` }} />
            )}
            <div className={styles.latestWash} />
            <div className={styles.latestBody}>
              <h3 className={styles.latestZone}>{latest.zone ?? 'Raidabend'}</h3>
              <p className={styles.latestMeta}>
                {latest.date.toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                · {de(latest.raiders)} Raider
              </p>
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
                <ul className={styles.killList}>
                  {latest.kills.map((kill, index) => (
                    <li key={`${kill.boss}-${index}`} className={styles.kill}>
                      {kill.boss}
                      {kill.difficulty ? ` · ${kill.difficulty}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        </section>
      )}
    </>
  );
}
