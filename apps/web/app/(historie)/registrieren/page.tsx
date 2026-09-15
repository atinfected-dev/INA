import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OrnateFrame, Panel } from '../../../components/ui/frame';
import { PAGE_ART, zoneArt } from '../../../lib/zone-art';
import { RegisterForm } from '../../../components/auth/forms';
import { getViewer } from '../../../lib/auth';
import { registerAction } from '../konto/actions';

export const metadata: Metadata = { title: 'Registrieren' };

export default async function RegisterPage() {
  if (await getViewer()) redirect('/konto');

  return (
    <>
      <OrnateFrame art={PAGE_ART.auth} title="Registrieren">
      <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '62ch' }}>
        Ein Konto verbindet dich mit deinen Charakteren. Nach der Registrierung stellst du für
        jeden Charakter einen Antrag, den ein Offizier bestätigt — aus einem Warcraft-Logs-Report
        geht nicht hervor, wer tatsächlich gespielt hat, deshalb entscheidet das ein Mensch.
      </p>
      </OrnateFrame>

      <Panel title="Neues Konto">
        <RegisterForm action={registerAction} />
      </Panel>

      <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
        Schon ein Konto? <a href="/anmelden">Anmelden</a>
      </p>
    </>
  );
}
