import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OrnateFrame, Panel } from '../../../components/ui/frame';
import { PAGE_ART, zoneArt } from '../../../lib/zone-art';
import { ClassName } from '../../../components/ui/bits';
import { DecisionForm } from '../../../components/auth/forms';
import { getViewer } from '../../../lib/auth';
import { loadPendingClaims } from '../../../lib/claims';
import { decideClaimAction } from '../../konto/actions';
import styles from '../../../components/auth/form.module.css';

export const metadata: Metadata = { title: 'Anträge' };

export default async function ClaimsAdminPage() {
  const viewer = await getViewer();
  if (!viewer) redirect('/anmelden');
  // Not a 403 page: an ordinary member has no reason to know this route exists.
  if (!viewer.isAdmin) redirect('/konto');

  const claims = await loadPendingClaims();

  return (
    <>
      <OrnateFrame art={PAGE_ART.account} title="Offene Anträge" subtitle="Offiziere">
      <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '64ch' }}>
        Bestätige nur, was du einordnen kannst. Eine Zuordnung heftet die gesamte Historie eines
        Charakters an eine Person — Parses, Tode, Anwesenheit.
      </p>
      </OrnateFrame>

      <Panel title={`${claims.length} ${claims.length === 1 ? 'Antrag' : 'Anträge'}`}>
        {claims.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Nichts zu tun.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '1.1rem' }}>
            {claims.map((claim) => (
              <li key={claim.id} style={{ display: 'grid', gap: '0.4rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--gold-200)' }}>
                    {claim.account.realName ?? claim.account.displayName}
                  </strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {claim.account.email}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>beansprucht</span>
                  <a href={`/players/${encodeURIComponent(claim.character.name)}`}>
                    <ClassName name={claim.character.name} className={claim.character.className} />
                  </a>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    {claim.character.realmName} ·{' '}
                    {claim.character._count.participation.toLocaleString('de-DE')} Pulls
                  </span>
                </div>

                {claim.note && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    „{claim.note}“
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <DecisionForm
                    action={decideClaimAction}
                    claimId={claim.id}
                    decision="approve"
                    label="Bestätigen"
                  />
                  <DecisionForm
                    action={decideClaimAction}
                    claimId={claim.id}
                    decision="reject"
                    label="Ablehnen"
                    danger
                    withReason
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p style={{ marginTop: '1rem' }}>
        <a href="/konto" className={styles.small}>
          Zurück zum Konto
        </a>
      </p>
    </>
  );
}
