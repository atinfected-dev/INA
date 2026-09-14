import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OrnateFrame, Panel } from '../../components/ui/frame';
import { PAGE_ART, zoneArt } from '../../lib/zone-art';
import { LoginForm } from '../../components/auth/forms';
import { getViewer } from '../../lib/auth';
import { loginAction } from '../konto/actions';

export const metadata: Metadata = { title: 'Anmelden' };

export default async function LoginPage() {
  if (await getViewer()) redirect('/konto');

  return (
    <>
      <OrnateFrame art={PAGE_ART.auth} title="Anmelden" subtitle="Für Gildenmitglieder">
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Mit der E-Mail-Adresse und dem Passwort deines Kontos.
        </p>
      </OrnateFrame>
      <Panel title="Anmeldung">
        <LoginForm action={loginAction} />
      </Panel>

      <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
        Noch kein Konto? <a href="/registrieren">Registrieren</a>
      </p>
    </>
  );
}
