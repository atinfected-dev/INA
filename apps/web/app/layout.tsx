import type { Metadata } from 'next';
import { Marcellus, Inter } from 'next/font/google';
import './globals.css';
import styles from './shell.module.css';
import { getViewer } from '../lib/auth';
import { CookieNotice } from '../components/cookie-notice';

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
  // Absolute URLs for the link preview; without this every image path would
  // be relative and the card would show nothing.
  metadataBase: new URL('https://isnotalone.de'),
  title: {
    default: 'INA Analytics',
    template: '%s — INA Analytics',
  },
  description:
    'Gilden-Statistiken und Ranglisten über alle Classic-Erweiterungen, aus den Warcraft-Logs der Gilde.',
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    siteName: 'Is Not Alone',
    title: 'Is Not Alone — Raidgeschichte seit Wrath of the Lich King',
    description:
      'Vier Jahre Raidgeschichte. Jeder Pull, jeder Wipe, jeder Erstkill — Ranglisten, Rekorde, Hall of Fame und Erfolge der Gilde.',
    url: 'https://isnotalone.de',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Is Not Alone — Raidgeschichte seit Wrath of the Lich King',
    description:
      'Vier Jahre Raidgeschichte. Jeder Pull, jeder Wipe, jeder Erstkill — Ranglisten, Rekorde, Hall of Fame und Erfolge der Gilde.',
  },
};

/**
 * Navigation.
 *
 * The leaderboards are grouped: parses, attendance, deaths, damage taken,
 * interrupts and dispels are six answers to the same kind of question, and six
 * top-level entries buried the rest of the site.
 *
 * Raid nights have no entry of their own — a list of logs is a working tool,
 * not something a member comes here to read. The pages still exist and stay
 * reachable from everything that links into them.
 */
const NAV = [
  { href: '/', label: 'Übersicht' },
  {
    label: 'Ranglisten',
    items: [
      { href: '/leaderboards', label: 'Parses' },
      { href: '/attendance', label: 'Attendance' },
      { href: '/deaths', label: 'Tode' },
      { href: '/erlittener-schaden', label: 'Schaden erlitten' },
      { href: '/unterbrechungen', label: 'Unterbrechungen' },
      { href: '/dispels', label: 'Dispels' },
    ],
  },
  { href: '/records', label: 'Rekorde' },
  { href: '/hall-of-fame', label: 'Hall of Fame' },
  { href: '/mitglieder', label: 'Mitglieder' },
  { href: '/players', label: 'Spieler' },
] as const;

/** Only officers see the achievement catalogue; members see their own on their profile. */
const ADMIN_NAV = [
  { href: '/erfolge', label: 'Erfolge' },
  { href: '/admin/inhalte', label: 'Inhalte' },
  { href: '/admin/claims', label: 'Anträge' },
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
              {NAV.map((item) =>
                'items' in item ? (
                  <details key={item.label} className={styles.navGroup}>
                    <summary>{item.label}</summary>
                    <div className={styles.navMenu}>
                      {item.items.map((entry) => (
                        <a key={entry.href} href={entry.href}>
                          {entry.label}
                        </a>
                      ))}
                    </div>
                  </details>
                ) : (
                  <a key={item.href} href={item.href} className={styles.navLink}>
                    {item.label}
                  </a>
                ),
              )}
              {viewer?.isAdmin &&
                ADMIN_NAV.map((item) => (
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

        <CookieNotice />

        <footer className={styles.footer}>
          <p style={{ margin: 0 }}>
            Nicht-kommerzielle Fanseite. Daten aus den Warcraft-Logs-Berichten der Gilde;
            Raid-Artworks und Klassen-Icons von Blizzards offiziellem Render-CDN, verwendet gemäß
            der Blizzard Fan Content Policy.
          </p>
          <p style={{ margin: '0.4rem 0 0' }}>
            World of Warcraft, Warcraft und Blizzard Entertainment sind Marken oder eingetragene
            Marken von Blizzard Entertainment, Inc. in den USA und/oder anderen Ländern. Diese Seite
            steht in keiner Verbindung zu Blizzard Entertainment.
          </p>
          <p style={{ margin: '0.6rem 0 0' }}>
            <a href="/impressum">Impressum</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
