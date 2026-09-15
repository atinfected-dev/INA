import type { Metadata } from 'next';
import { OrnateFrame, Panel } from '../../../components/ui/frame';
import { Divider } from '../../../components/ui/bits';
import { PAGE_ART } from '../../../lib/zone-art';

export const metadata: Metadata = { title: 'Impressum' };

/**
 * The legally required notice for a site run from Germany.
 *
 * Plain prose, kept to what the law asks for and what a reader needs: who is
 * responsible, how to reach them, and what the site is and is not. The site
 * is private and non-commercial, so there is no trade register, no VAT id and
 * no supervisory authority to name.
 */

const OWNER = {
  name: 'Frederik Ertz',
  street: 'Hermann-Löns-Straße 9',
  city: '66459 Kirkel',
  country: 'Deutschland',
  email: 'info@ertz-elektrotechnik.com',
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '1.4rem' }}>
      <h3
        style={{
          margin: '0 0 0.4rem',
          fontFamily: 'var(--font-display), Georgia, serif',
          fontWeight: 400,
          fontSize: '1.05rem',
          color: 'var(--gold-200)',
        }}
      >
        {title}
      </h3>
      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '70ch' }}>
        {children}
      </div>
    </section>
  );
}

export default function ImpressumPage() {
  return (
    <>
      <OrnateFrame art={PAGE_ART.auth} title="Impressum" subtitle="Angaben gemäß § 5 DDG">
        <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: '68ch' }}>
          INA Analytics ist eine private, nicht-kommerzielle Fanseite für die Gilde Is Not Alone.
          Sie zeigt Statistiken aus öffentlichen Warcraft-Logs-Berichten und verfolgt keine
          geschäftlichen Zwecke.
        </p>
      </OrnateFrame>

      <Divider label="Anbieter" />

      <Panel title="Verantwortlich">
        <Block title="Anbieter und Betreiber">
          <p style={{ margin: 0 }}>
            {OWNER.name}
            <br />
            {OWNER.street}
            <br />
            {OWNER.city}
            <br />
            {OWNER.country}
          </p>
        </Block>

        <Block title="Kontakt">
          <p style={{ margin: 0 }}>
            E-Mail: <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>
          </p>
        </Block>

        <Block title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
          <p style={{ margin: 0 }}>
            {OWNER.name}, {OWNER.street}, {OWNER.city}
          </p>
        </Block>
      </Panel>

      <Divider label="Hinweise" />

      <Panel title="Rechtliche Hinweise">
        <Block title="Haftung für Inhalte">
          <p style={{ margin: 0 }}>
            Die Inhalte dieser Seite wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
            Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden.
            Die gezeigten Statistiken werden automatisch aus Kampfaufzeichnungen berechnet, die
            Gildenmitglieder bei Warcraft Logs hochgeladen haben; Fehler in diesen Aufzeichnungen
            schlagen auf die Statistiken durch. Als Diensteanbieter bin ich für eigene Inhalte auf
            diesen Seiten nach den allgemeinen Gesetzen verantwortlich, jedoch nicht verpflichtet,
            übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
            forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung
            oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben
            hiervon unberührt. Eine diesbezügliche Haftung ist erst ab dem Zeitpunkt der Kenntnis
            einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender
            Rechtsverletzungen werden diese Inhalte umgehend entfernt.
          </p>
        </Block>

        <Block title="Haftung für Links">
          <p style={{ margin: 0 }}>
            Diese Seite enthält Links zu externen Websites Dritter, insbesondere zu Warcraft Logs
            und zu Blizzard Entertainment, auf deren Inhalte ich keinen Einfluss habe. Für diese
            fremden Inhalte kann ich keine Gewähr übernehmen; verantwortlich ist stets der jeweilige
            Anbieter oder Betreiber. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf
            mögliche Rechtsverstöße überprüft; rechtswidrige Inhalte waren nicht erkennbar. Eine
            permanente inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete Anhaltspunkte
            einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden
            derartige Links umgehend entfernt.
          </p>
        </Block>

        <Block title="Urheberrecht">
          <p style={{ margin: 0 }}>
            Die von mir erstellten Inhalte und Werke auf dieser Seite — Texte, Auswertungen,
            Gestaltung und Programmcode — unterliegen dem deutschen Urheberrecht. Beiträge Dritter
            sind als solche gekennzeichnet. Vervielfältigung, Bearbeitung und Verbreitung außerhalb
            der Grenzen des Urheberrechts bedürfen der Zustimmung des jeweiligen Urhebers.
          </p>
        </Block>

        <Block title="Blizzard Entertainment">
          <p style={{ margin: 0 }}>
            World of Warcraft, Warcraft und Blizzard Entertainment sind Marken oder eingetragene
            Marken von Blizzard Entertainment, Inc. in den USA und/oder anderen Ländern. Die auf
            dieser Seite gezeigten Klassensymbole und Raid-Illustrationen stammen aus dem offiziellen
            Medienangebot von Blizzard Entertainment und werden im Rahmen der Blizzard Fan Content
            Policy für diese nicht-kommerzielle Fanseite verwendet. Diese Seite steht in keiner
            Verbindung zu Blizzard Entertainment und wird von Blizzard weder unterstützt noch
            betrieben.
          </p>
        </Block>

        <Block title="Datenquelle">
          <p style={{ margin: 0 }}>
            Alle Kampfstatistiken stammen aus der offiziellen Schnittstelle von Warcraft Logs
            (warcraftlogs.com), einem Angebot der RPGLogs LLC, und beziehen sich auf Berichte, die
            Mitglieder der Gilde dort öffentlich hochgeladen haben. Warcraft Logs ist eine
            eingetragene Marke ihres Inhabers.
          </p>
        </Block>

        <Block title="Streitschlichtung">
          <p style={{ margin: 0 }}>
            Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </Block>
      </Panel>
    </>
  );
}
