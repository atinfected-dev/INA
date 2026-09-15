import type { BuildRow } from '../../lib/forever-builds';
import { CLASS_DE, CLASS_EN, classIcon } from '../../lib/talents';
import { classVar } from '../../lib/wow';
import { voteBuildAction } from '../../app/forever/talente/actions';
import styles from './build-list.module.css';

/**
 * Public builds, one row each: who made it, how often it was opened, how
 * many liked it. The vote is a plain form so it works without JavaScript;
 * the server counts one per browser.
 */
export function BuildList({ builds, back, empty }: { builds: BuildRow[]; back: string; empty: string }) {
  if (builds.length === 0) return <div className={styles.empty}>{empty}</div>;

  return (
    <ol className={styles.list}>
      {builds.map((build) => (
        <li key={build.id} className={styles.row}>
          <img className={styles.icon} src={classIcon(build.className)} alt="" width={36} height={36} loading="lazy" />
          <div className={styles.body}>
            <a href={`/forever/talente/${build.className}?b=${build.id}`} className={styles.title}>
              {build.title}
            </a>
            <div className={styles.meta}>
              <span style={{ color: classVar(CLASS_EN[build.className]) }}>{CLASS_DE[build.className]}</span>
              {build.author && <span> · von {build.author}</span>}
              <span> · {build.createdAt.toLocaleDateString('de-DE')}</span>
              <span className={styles.code}> · {build.code}</span>
            </div>
          </div>
          <div className={styles.numbers}>
            <span title="Aufrufe">{build.views.toLocaleString('de-DE')} Aufrufe</span>
            <span title="Stimmen">{build.score.toLocaleString('de-DE')} Stimmen</span>
          </div>
          <form action={voteBuildAction}>
            <input type="hidden" name="id" value={build.id} />
            <input type="hidden" name="back" value={back} />
            <button type="submit" className={styles.vote} title="Gefällt mir">
              ▲
            </button>
          </form>
        </li>
      ))}
    </ol>
  );
}
