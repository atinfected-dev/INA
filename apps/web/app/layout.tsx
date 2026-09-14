import type { Metadata } from 'next';
import { Marcellus, Inter } from 'next/font/google';
import './globals.css';
import styles from './shell.module.css';
import { getViewer } from '../lib/auth';

/*
 * Friz Quadrata, WoW's display face, is licensed and not redistributable.
 * Marcellus is a freely licensed glyphic serif with the same Roman-inscription
 * character, which is what carries the look.
 */
const display = Marcellus({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'INA Analytics',
    template: '%s — INA Analytics',
  },
  description:
    'Gilden-Statistiken und Ranglisten über alle Classic-Erweiterungen, auf Basis der Warcraft-Logs-API.',
};

const NAV = [
  { href: '/', label: 'Übersicht' },
  { href: '/leaderboards', label: 'Ranglisten' },
  { href: '/attendance', label: 'Attendance' },
  { href: '/deaths', label: 'Tode' },
  { href: '/erlittener-schaden', label: 'Schaden erlitten' },
  { href: '/records', label: 'Rekorde' },
  { href: '/hall-of-fame', label: 'Hall of Fame' },
  { href: '/erfolge', label: 'Erfolge' },
  { href: '/mitglieder', label: 'Mitglieder' },
  { href: '/players', label: 'Spieler' },
  { href: '/raids', label: 'Raids' },
] as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read here rather than per page: the masthead needs to know, and every page
  // that shows a real name gates on the same value.
  const viewer = await getViewer();

  return (
    <html lang="de" className={`${display.variable} ${body.variable}`}>
      <body>
        <header className={styles.masthead}>
          <div className={styles.mastheadInner}>
            <a href="/" className={styles.brand}>
              <span className={styles.brandMark} aria-hidden="true" />
              <span>
                <span className={styles.brandName}>INA Analytics</span>
                <span className={styles.brandTag}>Gilden-Historie seit Wrath of the Lich King</span>
              </span>
            </a>
            <nav className={styles.nav} aria-label="Hauptnavigation">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} className={styles.navLink}>
                  {item.label}
                </a>
              ))}
              <a href={viewer ? '/konto' : '/anmelden'} className={styles.navAccount}>
                {viewer ? viewer.displayName : 'Anmelden'}
              </a>
            </nav>
          </div>
          <div className={styles.mastheadRule} aria-hidden="true" />
        </header>

        <main className={styles.main}>{children}</main>

        <footer className={styles.footer}>
          Daten über die offizielle Warcraft-Logs-API v2. Kein Spielmaterial von Blizzard
          Entertainment wird verwendet.
        </footer>
      </body>
    </html>
  );
}
