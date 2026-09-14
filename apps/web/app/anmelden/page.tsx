import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Panel } from '../../components/ui/frame';
import { LoginForm } from '../../components/auth/forms';
import { getViewer } from '../../lib/auth';
import { loginAction } from '../konto/actions';

export const metadata: Metadata = { title: 'Anmelden' };

export default async function LoginPage() {
  if (await getViewer()) redirect('/konto');

  return (
    <>
      <h1>Anmelden</h1>
      <Panel title="Anmeldung">
        <LoginForm action={loginAction} />
      </Panel>

      <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
        Noch kein Konto? <a href="/registrieren">Registrieren</a>
      </p>
    </>
  );
}
