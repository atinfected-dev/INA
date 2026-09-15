import type { Metadata } from 'next';
import shell from '../shell.module.css';
import styles from './shell.module.css';
import { getViewer } from '../../lib/auth';
import { FOREVER_MARK } from '../../lib/forever-art';

export const metadata: Metadata = {
  title: {
    default: 'Forever',
    template: '%s — Is Not Alone · Forever',
  },
  description:
    'Is Not Alone in World of Warcraft: Forever — Aufstellung, Guides, Raidsheets, Hall of Fame und alles Wissenswerte zum Start.',
  openGraph: {
    title: 'Is Not Alone — World of Warcraft: Forever',
    description:
      'Wer spielt was, Guides und Raidsheets, die Hall of Fame der neuen Zeit — und alles, was Blizzard bisher zu Forever gesagt hat, auf Deutsch.',
    url: 'https://isnotalone.de/forever',
  },
};

/**
 * Forever's own masthead.
 *
 * A separate face for a separate era: nothing here leads into the Classic
 * rankings. What Forever produces — the roster, the guides, its Hall of Fame —
 * lives under this header; the Classic history stays one link away.
 */
const NAV = [
  { href: '/forever', label: 'Start' },
  { href: '/forever/talente', label: 'Talente' },
  { href: '/forever/voelker', label: 'Völker' },
  { href: '/forever/legacy', label: 'Legacy' },
  { href: '/forever/hall-of-fame', label: 'Hall of Fame' },
  { href: '/forever#guides', label: 'Guides' },
  { href: '/forever#aufstellung', label: 'Aufstellung' },
  { href: '/forever#wissen', label: 'Wissen' },
] as const;

export default async function ForeverLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  return (
    <>
      <header className={styles.masthead}>
        <div className={styles.inner}>
          <a href="/forever" className={styles.brand}>
            <img className={styles.brandMark} src={FOREVER_MARK} alt="" width={30} height={34} />
            <span>
              <span className={styles.brandName}>Is Not Alone</span>
              <span className={styles.brandTag}>World of Warcraft: Forever</span>
            </span>
          </a>
          <nav className={styles.nav} aria-label="Forever-Navigation">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} className={styles.navLink}>
                {item.label}
              </a>
            ))}
            {viewer?.isAdmin && (
              <a href="/admin/inhalte#forever" className={styles.navLink}>
                Inhalte
              </a>
            )}
            <a href="/" className={styles.navBack}>
              Gilden-Historie
            </a>
            <a href={viewer ? '/konto' : '/anmelden?weiter=/forever'} className={styles.navAccount}>
              {viewer ? viewer.displayName : 'Anmelden'}
            </a>
          </nav>
        </div>
        <div className={styles.rule} aria-hidden="true" />
      </header>

      <main className={shell.main}>{children}</main>
    </>
  );
}
