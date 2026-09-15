import type { Metadata } from 'next';
import { Marcellus, Inter } from 'next/font/google';
import './globals.css';
import styles from './shell.module.css';
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
 * The document shell only: fonts, the cookie notice, the footer.
 *
 * The site has two faces with their own mastheads — the Classic history under
 * `(historie)` and World of Warcraft: Forever under `/forever` — so each route
 * group brings its own header and content column.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${display.variable} ${body.variable}`}>
      <body>
        {children}

        <CookieNotice />

        <footer className={styles.footer}>
          <p style={{ margin: 0 }}>
            Nicht-kommerzielle Fanseite. Daten aus den Warcraft-Logs-Berichten der Gilde;
            Raid-Artworks, Klassen-Icons und Forever-Grafiken von Blizzards offiziellen Servern,
            verwendet gemäß der Blizzard Fan Content Policy.
          </p>
          <p style={{ margin: '0.4rem 0 0' }}>
            World of Warcraft, Warcraft und Blizzard Entertainment sind Marken oder eingetragene
            Marken von Blizzard Entertainment, Inc. in den USA und/oder anderen Ländern. Diese Seite
            steht in keiner Verbindung zu Blizzard Entertainment.
          </p>
          <p style={{ margin: '0.6rem 0 0' }}>
            <a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
