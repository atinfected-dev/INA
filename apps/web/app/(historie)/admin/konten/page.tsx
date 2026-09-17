import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OrnateFrame, Panel } from '../../../../components/ui/frame';
import { PAGE_ART } from '../../../../lib/zone-art';
import { getViewer } from '../../../../lib/auth';
import { listAccounts } from '../../../../lib/accounts';
import { setActiveAction, setOfficerAction } from './actions';
import styles from '../../../../components/auth/form.module.css';
import table from '../../../../components/ui/table.module.css';

export const metadata: Metadata = { title: 'Konten' };

type Search = Promise<Record<string, string | string[] | undefined>>;

const when = (date: Date | null) =>
  date ? date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/**
 * Every account, with the two switches an officer has: the officer role and
 * the login itself. Real names show here because officers already see them
 * on claims; nothing here is public.
 */
export default async function KontenPage({ searchParams }: { searchParams: Search }) {
  const viewer = await getViewer();
  if (!viewer) redirect('/anmelden');
  if (!viewer.isAdmin) redirect('/konto');

  const [accounts, search] = await Promise.all([listAccounts(), searchParams]);
  const ok = typeof search.ok === 'string' ? search.ok : null;
  const error = typeof search.fehler === 'string' ? search.fehler : null;
  const officers = accounts.filter((a) => a.isAdmin && a.isActive).length;

  return (
    <>
      <OrnateFrame
        art={PAGE_ART.account}
        title="Konten"
        subtitle={`${accounts.length} Konten · ${officers} ${officers === 1 ? 'Offizier' : 'Offiziere'}`}
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '66ch' }}>
          Offiziere prüfen Anträge, pflegen Inhalte und sehen, wer wie abgestimmt hat. Die eigene Rolle
          ändert immer ein anderer Offizier, und der letzte bleibt — sonst könnte niemand mehr etwas
          freigeben. Ein deaktiviertes Konto wird sofort abgemeldet und kann sich nicht mehr einloggen;
          Charaktere und Stimmen bleiben erhalten.
        </p>
      </OrnateFrame>

      {ok && <p className={styles.notice}>{ok}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <Panel title="Alle Konten" flush>
        <div style={{ overflowX: 'auto' }}>
          <table className={table.table}>
            <thead>
              <tr>
                <th>Anzeigename</th>
                <th>Klarname</th>
                <th>E-Mail</th>
                <th>Person</th>
                <th>Rolle</th>
                <th>Status</th>
                <th>Registriert</th>
                <th>Zuletzt an</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const me = account.id === viewer.id;
                return (
                  <tr key={account.id} style={account.isActive ? undefined : { opacity: 0.55 }}>
                    <td style={{ color: 'var(--gold-100)' }}>
                      {account.displayName}
                      {me && <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}> (du)</span>}
                    </td>
                    <td>{account.realName ?? '—'}</td>
                    <td style={{ fontSize: '0.85rem' }}>{account.email}</td>
                    <td>
                      {account.personName ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      {account.characters > 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}> · {account.characters} Char.</span>
                      )}
                    </td>
                    <td style={{ color: account.isAdmin ? 'var(--jade-200)' : 'var(--text-secondary)' }}>
                      {account.isAdmin ? 'Offizier' : 'Mitglied'}
                    </td>
                    <td style={{ color: account.isActive ? 'var(--ok)' : 'var(--danger)' }}>
                      {account.isActive ? 'aktiv' : 'deaktiviert'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{when(account.createdAt)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{when(account.lastLoginAt)}</td>
                    <td>
                      {!me && (
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <form action={setOfficerAction}>
                            <input type="hidden" name="id" value={account.id} />
                            <input type="hidden" name="name" value={account.displayName} />
                            <input type="hidden" name="officer" value={account.isAdmin ? '0' : '1'} />
                            <button type="submit" className={styles.small}>
                              {account.isAdmin ? 'Offizier entziehen' : 'Zum Offizier machen'}
                            </button>
                          </form>
                          <form action={setActiveAction}>
                            <input type="hidden" name="id" value={account.id} />
                            <input type="hidden" name="name" value={account.displayName} />
                            <input type="hidden" name="active" value={account.isActive ? '0' : '1'} />
                            <button type="submit" className={account.isActive ? styles.smallDanger : styles.small}>
                              {account.isActive ? 'Deaktivieren' : 'Aktivieren'}
                            </button>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
