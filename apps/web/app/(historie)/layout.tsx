import styles from '../shell.module.css';
import { getViewer } from '../../lib/auth';
import { FOREVER_MARK } from '../../lib/forever-art';

/**
 * The Classic history: masthead and navigation for everything the guild has
 * logged since Wrath of the Lich King.
 *
 * The leaderboards are grouped: parses, attendance, deaths, damage taken,
 * interrupts and dispels are six answers to the same kind of question, and six
 * top-level entries buried the rest of the site.
 *
 * Raid nights have no entry of their own — a list of logs is a working tool,
 * not something a member comes here to read. The pages still exist and stay
 * reachable from everything that links into them.
 *
 * Forever sits beside the brand rather than in the list: it is the other half
 * of the site, not one more page of this one.
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
  { href: '/admin/konten', label: 'Konten' },
] as const;

export default async function HistorieLayout({ children }: { children: React.ReactNode }) {
  // Read here rather than per page: the masthead needs to know, and every page
  // that shows a real name gates on the same value.
  const viewer = await getViewer();

  return (
    <>
      <header className={styles.masthead}>
        <div className={styles.mastheadInner}>
          <div className={styles.brandRow}>
            <a href="/" className={styles.brand}>
              <span className={styles.brandMark} aria-hidden="true" />
              <span>
                <span className={styles.brandName}>INA Analytics</span>
                <span className={styles.brandTag}>Gilden-Historie seit Wrath of the Lich King</span>
              </span>
            </a>
            <a href="/forever" className={styles.foreverLink}>
              <img src={FOREVER_MARK} alt="" width={18} height={20} />
              <span>Forever</span>
            </a>
          </div>
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
    </>
  );
}
