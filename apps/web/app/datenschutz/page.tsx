import type { Metadata } from 'next';
import { OrnateFrame, Panel } from '../../components/ui/frame';
import { Divider } from '../../components/ui/bits';
import { PAGE_ART } from '../../lib/zone-art';

export const metadata: Metadata = { title: 'Datenschutz' };

/**
 * The privacy notice, written against what the site actually does.
 *
 * Every processing named here exists in the code: the account table, the
 * session cookie, the Warcraft Logs import, the images from Blizzard's CDN,
 * the web server's access log. Nothing is listed "just in case" — a notice
 * that claims processing the site does not do is as wrong as one that hides
 * processing it does.
 */

const OWNER = {
  name: 'Frederik Ertz',
  street: 'Hermann-Löns-Straße 9',
  city: '66459 Kirkel',
  email: 'info@ertz-elektrotechnik.com',
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h3
        style={{
          margin: '0 0 0.45rem',
          fontFamily: 'var(--font-display), Georgia, serif',
          fontWeight: 400,
          fontSize: '1.05rem',
          color: 'var(--gold-200)',
        }}
      >
        {title}
      </h3>
      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: '72ch' }}>
        {children}
      </div>
    </section>
  );
}

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: '0 0 0.7rem' }}>{children}</p>
);

export default function DatenschutzPage() {
  return (
    <>
      <OrnateFrame art={PAGE_ART.auth} title="Datenschutzerklärung" subtitle="Stand: September 2026">
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '68ch' }}>
          Diese Seite ist eine private, nicht-kommerzielle Fanseite. Sie verarbeitet so wenig
          personenbezogene Daten wie möglich: kein Tracking, keine Werbung, keine Analysewerkzeuge,
          kein Newsletter. Was verarbeitet wird, steht hier vollständig.
        </p>
      </OrnateFrame>

      <Divider label="Verantwortlicher" />

      <Panel title="Wer verantwortlich ist">
        <Block title="Verantwortlicher im Sinne der DSGVO">
          <P>
            {OWNER.name}
            <br />
            {OWNER.street}
            <br />
            {OWNER.city}
            <br />
            E-Mail: <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>
          </P>
          <P>
            Ein Datenschutzbeauftragter ist nicht bestellt; die gesetzlichen Voraussetzungen dafür
            liegen bei einer privaten Seite dieser Größe nicht vor.
          </P>
        </Block>
      </Panel>

      <Divider label="Verarbeitungen" />

      <Panel title="Was beim Besuch der Seite passiert">
        <Block title="Server-Protokolle">
          <P>
            Beim Aufruf jeder Seite verarbeitet der Webserver technisch notwendig die IP-Adresse
            deines Geräts, Datum und Uhrzeit, die aufgerufene Adresse, den übertragenen Umfang, die
            Herkunftsseite und die Kennung deines Browsers. Diese Daten werden im Zugriffsprotokoll
            des Webservers gespeichert und nach 14 Tagen automatisch gelöscht. Sie dienen dem
            Betrieb, der Fehlersuche und der Abwehr von Angriffen und werden nicht mit anderen Daten
            zusammengeführt.
          </P>
          <P>
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO — mein berechtigtes Interesse an einem
            sicheren und funktionierenden Betrieb.
          </P>
        </Block>

        <Block title="Hosting">
          <P>
            Die Seite läuft auf einem von mir gemieteten und selbst verwalteten Server. Der
            Anbieter des Servers hat als technischer Dienstleister keinen Zugriff auf die Inhalte
            der Datenbank; er stellt Rechenleistung und Netzanbindung bereit.
          </P>
        </Block>

        <Block title="Cookies und lokaler Speicher">
          <P>
            Die Seite setzt genau <strong>ein Cookie</strong>, und das erst, wenn du dich anmeldest:{' '}
            <code>ina_session</code>. Es enthält eine zufällige Sitzungskennung ohne inhaltliche
            Bedeutung, ist nur für den Server lesbar (<em>httpOnly</em>), wird nur über eine
            verschlüsselte Verbindung übertragen und läuft nach 30 Tagen ab. Beim Abmelden wird es
            gelöscht. Es ist für die Anmeldung technisch erforderlich; eine Einwilligung ist dafür
            nicht nötig (§ 25 Abs. 2 Nr. 2 TDDDG).
          </P>
          <P>
            Ob du den Cookie-Hinweis bereits gelesen hast, merkt sich dein Browser im lokalen
            Speicher (<em>localStorage</em>) — nicht in einem Cookie, und ohne dass diese
            Information an den Server übertragen wird.
          </P>
          <P>Es gibt keine Werbe-, Analyse- oder Tracking-Cookies und keine Cookies Dritter.</P>
        </Block>

        <Block title="Schriften">
          <P>
            Die verwendeten Schriften werden von diesem Server selbst ausgeliefert. Es findet keine
            Verbindung zu Google oder einem anderen Schriftenanbieter statt.
          </P>
        </Block>

        <Block title="Bilder von Blizzard Entertainment">
          <P>
            Klassensymbole und Raid-Illustrationen werden nicht von diesem Server, sondern direkt von
            den Servern von Blizzard Entertainment geladen (<code>render.worldofwarcraft.com</code>).
            Dabei übermittelt dein Browser technisch bedingt deine IP-Adresse und die üblichen
            Browserdaten an Blizzard Entertainment, Inc., USA. Auf diese Verarbeitung habe ich keinen
            Einfluss; es handelt sich um dieselben Bilddateien, die auch die offiziellen Blizzard-Seiten
            ausliefern.
          </P>
          <P>
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO — mein berechtigtes Interesse, die
            Spielinhalte mit den offiziellen Grafiken darzustellen. Die USA sind ein Drittland; die
            Übermittlung beschränkt sich auf die für das Laden eines Bildes technisch unvermeidbaren
            Daten. Wer das nicht möchte, kann das Laden von Bildern fremder Herkunft im Browser
            unterbinden; die Seite bleibt dann ohne diese Bilder nutzbar.
          </P>
        </Block>
      </Panel>

      <Panel title="Statistiken aus Warcraft Logs">
        <Block title="Woher die Daten kommen">
          <P>
            Alle Kampfstatistiken auf dieser Seite stammen aus Berichten, die Gildenmitglieder bei{' '}
            <a href="https://www.warcraftlogs.com" rel="noopener">Warcraft Logs</a> öffentlich
            hochgeladen haben, und werden über die offizielle Schnittstelle von Warcraft Logs
            abgerufen. Verarbeitet werden Charakternamen, Realm, Klasse und Rolle sowie
            Leistungswerte aus den Kämpfen — Schaden, Heilung, Parse-Perzentile, Tode, erlittener
            Schaden, Unterbrechungen, Dispels, Anwesenheit an Raidabenden.
          </P>
          <P>
            Charakternamen sind Spielfiguren-Namen. Sie können sich dennoch einer Person zuordnen
            lassen; deshalb behandle ich sie wie personenbezogene Daten. Klarnamen werden aus
            Warcraft Logs nicht übernommen.
          </P>
          <P>
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO — das berechtigte Interesse der Gilde
            und ihrer Mitglieder an einer gemeinsamen, nachvollziehbaren Raidgeschichte. Die Daten
            sind bei Warcraft Logs bereits öffentlich; diese Seite fasst sie zusammen, sie
            veröffentlicht nichts, was dort nicht ohnehin einsehbar wäre.
          </P>
        </Block>

        <Block title="Widerspruch für einen Charakter">
          <P>
            Wenn du nicht möchtest, dass ein von dir gespielter Charakter auf dieser Seite erscheint,
            schreib mir eine E-Mail mit dem Charakternamen und dem Realm. Der Charakter wird dann aus
            allen Ranglisten und Profilen entfernt und von künftigen Importen ausgenommen.
          </P>
        </Block>
      </Panel>

      <Panel title="Konto und Anmeldung">
        <Block title="Registrierung">
          <P>
            Ein Konto ist freiwillig; die Seite lässt sich vollständig ohne eines lesen. Bei der
            Registrierung werden E-Mail-Adresse, ein öffentlicher Anzeigename, optional dein
            Klarname und ein Passwort erhoben. Das Passwort wird ausschließlich als
            kryptografischer Hash (scrypt) gespeichert; es ist auch für mich nicht lesbar. Dazu
            speichert die Seite den Zeitpunkt der Registrierung und der letzten Anmeldung.
          </P>
          <P>
            Der Anzeigename ist öffentlich sichtbar. Der Klarname wird nur angemeldeten
            Gildenmitgliedern angezeigt, nie öffentlich. Die E-Mail-Adresse wird nur zur Anmeldung
            genutzt und ist außer für mich nur für die Offiziere sichtbar, die deinen Antrag auf
            einen Charakter prüfen.
          </P>
          <P>
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO — die Bereitstellung des Kontos, das du
            angefordert hast.
          </P>
        </Block>

        <Block title="Charaktere beanspruchen">
          <P>
            Über dein Konto kannst du Charaktere als deine eigenen beanspruchen. Ein Offizier
            bestätigt oder lehnt ab; dabei sieht er deinen Anzeigenamen, Klarnamen und deine
            E-Mail-Adresse. Nach Bestätigung werden die Statistiken der Charaktere unter deinem
            Anzeigenamen zusammengeführt und deine Erfolge und angepinnten Auszeichnungen auf deinem
            Profil gezeigt.
          </P>
        </Block>

        <Block title="Speicherdauer und Löschung">
          <P>
            Kontodaten bleiben gespeichert, solange das Konto besteht. Du kannst dein Konto jederzeit
            per E-Mail löschen lassen; die Zuordnung deiner Charaktere zu deiner Person wird dann
            aufgehoben, die Charakterstatistiken selbst bleiben als Teil der Gildenhistorie
            bestehen, es sei denn, du widersprichst auch dieser (siehe oben). Sitzungen enden mit
            dem Abmelden oder nach 30 Tagen.
          </P>
        </Block>
      </Panel>

      <Divider label="Deine Rechte" />

      <Panel title="Was du verlangen kannst">
        <Block title="Rechte nach der DSGVO">
          <P>
            Du hast das Recht auf Auskunft über die zu dir gespeicherten Daten (Art. 15), auf
            Berichtigung (Art. 16), auf Löschung (Art. 17), auf Einschränkung der Verarbeitung
            (Art. 18), auf Datenübertragbarkeit (Art. 20) und auf Widerspruch gegen Verarbeitungen,
            die auf einem berechtigten Interesse beruhen (Art. 21). Für all das genügt eine E-Mail
            an die oben genannte Adresse.
          </P>
          <P>
            Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
            Zuständig für mich ist das Unabhängige Datenschutzzentrum Saarland, Fritz-Dobisch-Straße
            12, 66111 Saarbrücken.
          </P>
        </Block>

        <Block title="Keine automatisierten Entscheidungen">
          <P>
            Es findet keine automatisierte Entscheidungsfindung und kein Profiling im Sinne von
            Art. 22 DSGVO statt. Ranglisten und Erfolge sind Auswertungen von Spielstatistiken; sie
            haben keine rechtliche Wirkung und beeinträchtigen niemanden in ähnlicher Weise.
          </P>
        </Block>

        <Block title="Änderungen">
          <P>
            Wenn sich die Technik der Seite ändert — etwa neue Funktionen, die zusätzliche Daten
            brauchen —, wird diese Erklärung angepasst. Der Stand steht oben.
          </P>
        </Block>
      </Panel>
    </>
  );
}
