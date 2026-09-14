import { OrnateFrame, Panel } from '../components/ui/frame';
import { Divider } from '../components/ui/bits';

/**
 * Placeholder overview.
 *
 * Replaced in M5/M6 by the real dashboard. It exists now so the shell, fonts
 * and frames can be verified in the browser before any data exists.
 */
export default function HomePage() {
  return (
    <>
      <OrnateFrame
        title="INA Analytics"
        subtitle="Gilden-Historie und Ranglisten über alle Classic-Erweiterungen"
      >
        <p style={{ marginTop: 0, color: 'var(--text-secondary)', maxWidth: '66ch' }}>
          Die Plattform importiert die Warcraft-Logs-Historie der Gilde einmalig, hält sie dauerhaft
          vor und wertet sie erweiterungsübergreifend aus — pro Charakter und pro Person.
        </p>
        <p style={{ marginBottom: 0, color: 'var(--text-muted)' }}>
          Noch keine Daten importiert. Sobald Gildenname, Realm und Region konfiguriert sind, füllt
          der erste Sync diese Seite.
        </p>
      </OrnateFrame>

      <Divider label="Aufbau" />

      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(17rem, 1fr))',
        }}
      >
        <Panel title="Verifizierte API-Anbindung">
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Alle Abfragen laufen gegen das live eingelesene GraphQL-Schema der Warcraft-Logs-API v2.
            Ein Feld, das es nicht gibt, bricht den Build.
          </p>
        </Panel>
        <Panel title="Personen statt nur Charaktere">
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Wer über die Jahre mehrere Charaktere gespielt hat, taucht wahlweise als Charakter oder
            als Person in jeder Statistik auf.
          </p>
        </Panel>
        <Panel title="Nachvollziehbare Ranglisten">
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Jede Rangliste nennt ihre Formel und zeigt die Stichprobe. Ein einzelner Glücks-Parse
            gewinnt keine Wertung.
          </p>
        </Panel>
      </div>
    </>
  );
}
