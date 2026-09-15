/**
 * Everything known about World of Warcraft: Forever, as content.
 *
 * Written from Blizzard's announcement and the reporting around it, as of
 * 15 September 2026, in the guild's own words. Where Blizzard has not said
 * something, the text says so instead of guessing — a member planning a
 * character deserves to know which facts are firm and which are still open.
 *
 * Data rather than JSX, so an officer can correct a fact without touching a
 * page, and so every topic renders through the same template.
 */

import type { FeatureKey, ZoneKey } from './forever-art';

export interface Table {
  columns: string[];
  rows: string[][];
}

export interface Shot {
  /** File under public/forever/ (Blizzard press-kit screenshot, see SOURCES.md there). */
  file: string;
  title: string;
  caption?: string;
}

export interface Section {
  title: string;
  /** Paragraphs, plain text; a leading "!" marks a note about what is unknown. */
  paragraphs?: string[];
  bullets?: string[];
  table?: Table;
  /** Screenshots shown above the text. */
  images?: Shot[];
  /** Where to read on, e.g. the racials page. */
  link?: { href: string; label: string };
}

export interface Topic {
  slug: string;
  kicker: string;
  title: string;
  teaser: string;
  intro: string;
  /** Blizzard's framed Forever still for the tile. */
  art: FeatureKey;
  /** Blizzard's reworked-zone still behind the topic's own hero. */
  heroArt: ZoneKey;
  sections: Section[];
}

export const WISSEN_STAND = '16. September 2026';

export const WISSEN_TOPICS: Topic[] = [
  // --- Völker ----------------------------------------------------------------
  {
    slug: 'voelker',
    kicker: 'Völker',
    title: 'Neun Völker',
    teaser: 'Acht Bekannte, ein neues — und sechs Paarungen, die es nie gab.',
    intro:
      'Forever bringt die acht Völker von 2004 zurück und stellt ihnen die Skyborne zur Seite, ein Elfenvolk, das sich beim Erstellen für eine Seite entscheidet. Sechs Volk-Klasse-Paarungen sind neu; zwei weitere hat Blizzard für das Frühjahr angekündigt, ohne zu sagen, welche.',
    art: 'skyborne',
    heroArt: 'ashenvale',
    sections: [
      {
        title: 'Allianz',
        table: {
          columns: ['Volk', 'Klassen', 'Neu in Forever'],
          rows: [
            ['Mensch', 'Krieger, Paladin, Jäger, Schurke, Priester, Magier, Hexenmeister', 'Jäger'],
            ['Zwerg', 'Krieger, Paladin, Jäger, Schurke, Priester, Schamane', 'Schamane'],
            ['Nachtelf', 'Krieger, Jäger, Schurke, Priester, Druide', '—'],
            ['Gnom', 'Krieger, Schurke, Priester, Magier, Hexenmeister', 'Priester'],
          ],
        },
      },
      {
        title: 'Horde',
        table: {
          columns: ['Volk', 'Klassen', 'Neu in Forever'],
          rows: [
            ['Orc', 'Krieger, Jäger, Schurke, Schamane, Magier, Hexenmeister', 'Magier'],
            ['Untoter', 'Krieger, Paladin, Schurke, Priester, Magier, Hexenmeister', 'Paladin'],
            ['Taure', 'Krieger, Jäger, Schamane, Druide', '—'],
            ['Troll', 'Krieger, Jäger, Schurke, Priester, Schamane, Magier, Hexenmeister', 'Hexenmeister'],
          ],
        },
        paragraphs: [
          'Für die Untoten hat Blizzard mehr als eine neue Klasse angekündigt: eine eigene Geschichte um Bandarion Keep, den Paladin als Vergeltung gedacht, und eine Quest für das epische Reittier auf Stufe 60.',
        ],
      },
      {
        title: 'Skyborne — das neue Volk',
        paragraphs: [
          'Elfen, die von verbannten Hochgeborenen abstammen und vor Generationen einen Pakt mit den Windgeistern des Himmelswalls schlossen. Ihre Heimat ist die Zephras-Insel, das Startgebiet für Stufe 1 bis 12.',
          'Skyborne gehören keiner Fraktion an, bis du einen erstellst: dann wählst du Allianz oder Horde. Die Wahl entscheidet über eine Klasse — auf Allianzseite kommt der Magier dazu, auf Hordeseite der Schamane.',
          'Startgebiet und Volk sind an das Skyborne Heroic Pack oder eine höhere Edition gebunden (siehe Roadmap & Editionen).',
          'Die Skyborne nennen sich selbst Shandori, das verborgene Volk. Sie stammen von Hochgeborenen ab, die nach dem Krieg der Ahnen in Eldre\'Thalas blieben und sich gegen Prinz Tortheldrins Pakt mit dämonischer Macht erhoben. Die Rebellen verloren, flohen über das Meer und wurden von Windgeistern gerettet, die ein Stück ihrer Insel in den Himmelswall hoben. Zehntausend Jahre in der Ebene der Luft haben Körperbau, Haut, Haar und Augen verändert.',
          'Zurück nach Azeroth treibt sie eine Krise: Die freundlichen Windgeister sind verschwunden, die Pylonen, die die Insel tragen, versagen, Teile brechen weg. Drei Bewegungen streiten um den Weg: die Windformer mit ihren schamanistischen Traditionen (Horde), die Hohe Ordnung als arkane Erben der Magister (Allianz) und ein Al\'Akir-Kult, der die Angst ausnutzt. Eigene Druidengestalten, Stimmen, Tänze und Anpassungen sind angekündigt.',
        ],
        images: [
          { file: 'zone-zephras.webp', title: 'Zephras-Insel', caption: 'Startgebiet der Skyborne, Stufe 1 bis 12' },
        ],
        table: {
          columns: ['Für beide Seiten', 'Nur Allianz', 'Nur Horde'],
          rows: [['Krieger, Jäger, Schurke, Druide', 'Magier', 'Schamane']],
        },
      },
      {
        title: 'Volksfähigkeiten',
        paragraphs: [
          'Jedes Volk erhält zwei aktive und zwei passive Fähigkeiten, ähnlich stark, aber anders auf Angriff, Verteidigung und Nutzen verteilt. Die Widerstands-Boni sind gestrichen, Waffen-Spezialisierungen geben kritische Trefferchance statt Waffenfertigkeit.',
          'Ein paar Beispiele: Steingestalt senkt jetzt direkt den körperlichen Schaden statt Rüstung zu geben, Wille der Verlassenen bricht den Effekt, schützt aber nicht mehr danach, Kannibalismus stellt auch Mana wieder her, Zwerge treffen Wildtiere 5 % härter und bekommen 1 % kritische Chance mit Streitkolben.',
          'Alle 37 Fähigkeiten der neun Völker stehen mit Classic-Vergleich auf der Völkerseite.',
        ],
        link: { href: '/forever/voelker', label: 'Alle Volksfähigkeiten im Vergleich →' },
      },
      {
        title: 'Was noch offen ist',
        bullets: [
          'Die endgültigen Zahlen der Volksfähigkeiten — gezeigt wurden Werte eines Messe-Builds.',
          'Die zwei weiteren Volk-Klasse-Paarungen, die für Frühjahr 2027 angekündigt sind.',
          'Ob die acht alten Völker geänderte Startgebiete bekommen.',
          'Ob es neben den Skyborne ein zweites neues Volk gibt — Berichte widersprechen sich, Blizzard hat nur eines gezeigt.',
        ],
      },
    ],
  },

  // --- Klassen ---------------------------------------------------------------
  {
    slug: 'klassen',
    kicker: 'Klassen & Talente',
    title: 'Neun Klassen, 470 Talente',
    teaser: 'Vertraute Klassen, umgebaute Bäume, 131 neue Talente.',
    intro:
      'Die neun Klassen des Originals bleiben. Was sich ändert, sind die Talentbäume: sieben Reihen wie gehabt, aber mit einem zusätzlichen Meilenstein, vielen neuen Schlusstalenten und einer Reihe von Regeln, die für alle gelten.',
    art: 'power',
    heroArt: 'darkshore',
    sections: [
      {
        title: 'Was für alle Klassen gilt',
        bullets: [
          'Trefferchance und kritische Trefferchance gelten einheitlich für Zauber, Nahkampf und Fernkampf.',
          'Waffenfertigkeit wurde neu gewichtet und gibt je Gegenstand weniger Wertung.',
          'Ein Drittel der Bonusheilung wirkt auch als Zauberschaden.',
          'Talentbäume behalten sieben Reihen; die Meilensteine liegen bei 11, 16, 21 und 31 Punkten — der 16er ist neu.',
          'Segen der Könige, Göttliche Seele und Verbessertes Mal der Wildnis sind Grundfähigkeiten, keine Talente mehr.',
          'Kämpfe gegen einzelne Gegner sollen zehn bis fünfzehn Sekunden dauern; in Dungeons ist Kontrolle über Gegner wieder Pflicht.',
        ],
      },
      {
        title: 'Talente in Zahlen',
        paragraphs: [
          'Insgesamt 470 Talente in 27 Bäumen. Gegen den Stand von Classic Era: 131 neu, 217 überarbeitet, 122 unverändert. 14 der 27 Schlusstalente sind neu.',
        ],
        table: {
          columns: ['Klasse', 'Talente', 'Neu', 'Überarbeitet', 'Unverändert', 'Neue Schlusstalente'],
          rows: [
            ['Krieger', '54', '11', '30', '13', '0 von 3'],
            ['Paladin', '52', '20', '16', '16', '2 von 3'],
            ['Jäger', '50', '15', '16', '19', '1 von 3'],
            ['Schurke', '53', '10', '25', '18', '2 von 3'],
            ['Priester', '53', '14', '27', '12', '1 von 3'],
            ['Schamane', '50', '15', '25', '10', '3 von 3'],
            ['Magier', '54', '8', '30', '16', '0 von 3'],
            ['Hexenmeister', '52', '23', '26', '3', '3 von 3'],
            ['Druide', '52', '15', '22', '15', '2 von 3'],
          ],
        },
      },
      {
        title: 'Die Klassen',
        table: {
          columns: ['Klasse', 'Rollen', 'Was bekannt ist'],
          rows: [
            ['Krieger', 'Tank, Schaden', 'Spott profitiert von der vereinheitlichten Trefferchance; Waffenfertigkeit neu gewichtet; „taktisches Tanken" angekündigt.'],
            ['Paladin', 'Tank, Heiler, Schaden', 'Bäume: Light\'s Vigil, Templar\'s Bulwark, Twist of Light. Heiliger Schlag ab Stufe 6, Siegel verbrauchen sich nicht mehr, Siegel des Zorns als Spott, Weihe als Grundfähigkeit. Neu für Untote.'],
            ['Jäger', 'Schaden', 'Überleben-Baum als Nahkampf mit zwei Waffen; Falke rufen; Einzelgänger (ohne Begleiter). Neu für Menschen.'],
            ['Schurke', 'Schaden', 'Änderungen noch nicht benannt.'],
            ['Priester', 'Heiler, Schaden', 'Änderungen noch nicht benannt. Neu für Gnome.'],
            ['Schamane', 'Heiler, Schaden', 'Alle drei Schlusstalente neu. Neu für Zwerge und Horde-Skyborne.'],
            ['Magier', 'Schaden', 'Arkanschlag, Geschossbeschuss, Heiße Serie und Eislanze bestätigt — welcher Baum sie trägt, ist offen. Neu für Orcs und Allianz-Skyborne.'],
            ['Hexenmeister', 'Schaden', 'Die meisten neuen Talente aller Klassen (23), alle drei Schlusstalente neu. Neu für Trolle.'],
            ['Druide', 'Tank, Heiler, Schaden', 'Neue Gestalten für Skyborne-Druiden angekündigt, ohne Details.'],
          ],
        },
      },
      {
        title: 'Was die Panels gezeigt haben',
        bullets: [
          'Die neue 16-Punkte-Reihe trägt in acht von neun Klassen neue Talente — etwa Zermalmen für Wildheit-Druiden, Heiße Serie für Feuermagier und Wütende Schläge für Furor-Krieger.',
          'Erklärtes Ziel: alle 27 Spezialisierungen in Dungeons und Schlachtzügen brauchbar — brauchbar, nicht gleich. Stärken und Schwächen bleiben, manche Spezialisierung glänzt je nach Gegnertyp oder Nutzen.',
          'Paladin als Vorzeigebeispiel: Heiliger Schlag kehrt aus der ursprünglichen Beta zurück als Waffenangriff ab Stufe 6, auf dem alle drei Bäume aufbauen; Richturteil verbraucht das Siegel nicht mehr. Siegel des Zorns ist das Tank-Siegel — Schaden pro Schlag, besser mit schnellen Waffen, kleiner Schild, Richturteil spottet aus 10 Metern.',
          'Heiliger Schock rückt vom 31- auf den 21-Punkte-Platz mit 10 Sekunden Abklingzeit. Schutz bekommt Templar\'s Bulwark, ein Schild in Höhe der vollen Gesundheit, der Nachsicht auslöst und damit mit Gottesschild konkurriert. Vergeltung bekommt Twist of Light (ein Echo des ersetzten Siegels) und Champion of the Light (Intelligenz wird zu Zauberschaden und Heilung). Kein Unterbrechen, keine Verlangsamung, wenig Reichweite — die Schwächen bleiben absichtlich.',
          'Jäger legen Fallen im Kampf, Gezielter Schuss und Mehrfachschuss teilen sich eine Abklingzeit, die Begleiterleiste hat neue Befehle. Schamanen rufen Totems zurück und bekommen überarbeitete Totems. Priester lernen Zauber, die es in Vanilla nie gab: Sühne, Gebet der Besserung, Bindende Heilung, Schattenwort: Tod.',
          'Alle Klassen: einheitliche Treffer- und Kritchance über Nah-, Fern- und Zauberkampf, Waffenfertigkeit dünner verteilt, Heilausrüstung trägt Zauberschaden, Zauberstäbe geben ab etwa Stufe 10 Zauberschaden. Abhärtung kommt nicht.',
        ],
      },
      {
        title: 'Was noch offen ist',
        bullets: [
          'Die vollständigen Talentbäume aller Klassen außer dem Paladin.',
          'Kosten und Regeln fürs Umskillen; ob es eine zweite Spezialisierung gibt.',
          'PvP-Talente — die Struktur ist nicht festgelegt.',
          'Ab welcher Stufe und wie viele Talentpunkte es gibt.',
        ],
      },
    ],
  },

  // --- Welt ------------------------------------------------------------------
  {
    slug: 'welt',
    kicker: 'Welt',
    title: 'Neue Gebiete, Dungeons, Schlachtzüge',
    teaser: 'Drei neue Gebiete, neun Dungeons, drei Raids zum Start — und ein Schlachtfeld.',
    intro:
      'Forever ist Azeroth nach Archimondes Fall. Zu den bekannten Gebieten kommen neue, mehrere alte werden ausgebaut, und die Dungeons decken den ganzen Weg bis Stufe 60 ab. Die ersten Schlachtzüge öffnen fünf Wochen nach dem Start.',
    art: 'expanses',
    heroArt: 'felwood',
    sections: [
      {
        title: 'Regelwerke statt Realms',
        paragraphs: [
          'Es gibt keine Realm-Liste mehr. Man wählt ein Regelwerk und landet in einer sehr großen gemeinsamen Welt dafür: Normal (Welt-PvP nur freiwillig), PvP (umkämpfte Gebiete bleiben gefährlich), Rollenspiel, und nach dem Start Hardcore mit endgültigem Tod. Das soll zwei alte Probleme lösen: den langsam sterbenden Server und die Warteschlange auf dem beliebten.',
          'Die Welt soll sich trotzdem wie ein Realm anfühlen: dieselben Namen beim Questen und Sammeln, Gildenmitglieder landen in derselben Kopie der Außenwelt, bevor man überhaupt eine Gruppe bildet. Man stellt eine Sprache ein und wird mit Spielern derselben Sprache zusammengelegt.',
          'Fraktionen bleiben getrennt, Dungeon- und Schlachtzugsgruppen kommen aus demselben Regelwerk. PvP-Regelwerke nutzen die Fraktionsausgleichs-Werkzeuge aus Season of Discovery. Hardcore ist ein abgeschlossenes System: nichts wird hineingetragen, Belohnungen von dort können aber auf anderen Charakteren erscheinen. Ein gestorbener Hardcore-Charakter darf in ein anderes Regelwerk wechseln — erstmals auch nach PvP.',
          'Charaktere tragen Vor- und Nachnamen, einmalig in der ganzen Region. Deshalb braucht auch unsere Log-Zuordnung ab November eine neue Abfrage.',
        ],
      },
      {
        title: 'Neue Gebiete',
        images: [
          { file: 'zone-riverglades.webp', title: 'Riverglades', caption: 'Das neue Gebiet für die Mitte 30 bis Mitte 40' },
          { file: 'zone-hyjal.webp', title: 'Hyjal', caption: 'Endgame-Gebiet, nach Archimondes Fall neu bewachsen' },
          { file: 'zone-dalaran.webp', title: 'Dalaran', caption: 'Wiederaufgebaut, noch im Alteracgebirge, die Barriere gerade gefallen' },
          { file: 'zone-mulgore.webp', title: 'Mulgore', caption: 'Alte Gebiete mit neuen Quests, Händlern und Rezepten' },
        ],
        table: {
          columns: ['Gebiet', 'Stufen', 'Was bekannt ist'],
          rows: [
            ['Zephras-Insel', '1–12', 'Startgebiet der Skyborne. Elementare, luftige Themen, Architektur des Himmelswalls. Nur mit Heroic Pack oder höher.'],
            ['Riverglades', 'Mitte 30 bis Mitte 40', 'Für beide Fraktionen, etwa so groß wie Schlingendorntal, weit über 150 Quests. Powderfuse Port, Gnolle und Oger, Powderfuse-Goblins, Schattenhammer, Bruderschaft des Pferdes.'],
            ['Hyjal', 'nicht veröffentlicht', 'Nach der Schlacht um den Hyjal, mit der Dunkelflüsterschlucht.'],
            ["Shen'dralas", 'nicht veröffentlicht', "Zwischen Mulgore und Desolace, Zugang von Süden durch das Tal der Knochen; verbunden mit Eldre'Thalas."],
          ],
        },
        paragraphs: [
          'Über 1.000 neue Quests verteilen sich auf den ganzen Weg von 1 bis 60, nicht nur ans Ende. Die Riverglades liegen an der Ostküste zwischen Rotkamm, Brennender Steppe, Ödland und Sümpfen des Elends und sind über eine neue Abzweigung der Rotkamm-Straße erreichbar; Horde startet bei Ragmar, Allianz in Farhold Keep. Die Geschichte dreht sich um Handelswege, alte Rechnungen und Nachbarn — niemand rettet die Welt.',
          'Ausgebaut werden unter anderem das Sumpfland (über 25 Quests und eine neue Route), Desolace (Zentaurenfraktionen) und Azshara (deutlich erweitert). Drei neue Schiffsrouten verbinden die Levelgebiete ohne Fliegen: Sturmwind–Auberdine, Menethil–Southshore–Auberdine und eine von Dampfdruckhafen in Tanaris an ein neues Ziel. Blizzard spricht von drei neuen Gebieten, Berichte nennen vier — ob Hyjal oder Shen\'dralas als Erweiterung eines alten Gebiets zählt, ist offen.',
        ],
      },
      {
        title: 'Dungeons zum Start',
        images: [
          { file: 'dungeon-hall-of-thanes.webp', title: 'Halle der Thane', caption: 'Stufe 13–18, unter Eisenschmiede' },
          { file: 'dungeon-lordaeron.webp', title: 'Ruinen von Lordaeron', caption: 'Stufe 15–20' },
          { file: 'dungeon-excavation-site.webp', title: 'Titanen-Ausgrabung', caption: 'Stufe 24–29, Sumpfland' },
          { file: 'dungeon-dalaran.webp', title: 'Dalaran', caption: 'Stufe 28–33, mehr Stadt als Dungeon' },
          { file: 'dungeon-drowned-city.webp', title: 'Die Ertrunkene Stadt', caption: 'Stufe 35–40, auf der BlizzCon spielbar' },
          { file: 'dungeon-timbermaw-hold.webp', title: 'Schwarzschlund-Feste', caption: 'Stufe 55–60, hinter dem Tor in Azshara' },
          { file: 'dungeon-shaper-terrace.webp', title: 'Terrasse der Gestalter', caption: 'Stufe 58–60, Un\'Goro' },
        ],
        table: {
          columns: ['Dungeon', 'Stufen', 'Wo', 'Was bekannt ist'],
          rows: [
            ['Halle der Thane', '13–18', 'Unter Eisenschmiede', '—'],
            ['Ruinen von Lordaeron', '15–20', 'Gebiet der Verlassenen', '—'],
            ['Ausgrabung im Sumpfland', '24–29', "Über Whelgars Ausgrabung", 'Endgültiger Name offen'],
            ['Stadt Dalaran', '28–33', 'Kanaleingang am Lordamere-See', 'Schatten des Erzmagiers (Stufe 33); „chaotisch, mit magischen Problemen"'],
            ['Die Ertrunkene Stadt', '35–40', '—', 'Naga und Piraten, geflutet, im Stil der Trolle'],
            ["Krol'dok-Festung", '40–45', '—', '„Verderbnis in der Tiefe"'],
            ['Gefängnis von Alcaz', '48–53', '—', '—'],
            ['Schwarzschlund-Feste', '55–60', '—', '—'],
            ['Terrasse der Gestalter', '58–60', '—', '—'],
          ],
        },
        paragraphs: [
          'Was die Panels zu den einzelnen Instanzen erzählt haben: In der Halle der Thane, einer Grabstätte der Zwergenkönige, ist jemand eingebrochen — vermutlich Dunkeleisen; die Allianz soll aufräumen, die Horde muss sich hinein schleichen oder kämpfen. In Lordaeron bergen die Verlassenen Erbstücke aus ihrer zerstörten Hauptstadt, während die Geißel sie noch hält und ein Nekromant die nächste Stadt ins Visier nimmt. Die Titanen-Ausgrabung über Whelgars Grabung liegt in seltsamem Nebel mit aktiven Konstrukten und einem in der Zeit festgefrorenen Bereich, angebunden an die Forscherliga.',
          'In Dalaran versagen mit der Barriere die Verzauberungen und dämonische Energie sickert ein; man erkundet ausdrücklich die Stadt. Die Ertrunkene Stadt sind Trollruinen vor Schlingendorntal, gerade aus dem Meer gestiegen, mit Naga, Trollen und einem Piratenwrack. Krol\'dor ist eine große Außen-Instanz in den Riverglades, in der Oger Siedlungen überfallen und nachts etwas skandieren, das nach dem Schattenhammer klingt — gedacht als lange fehlende Alternative zum Scharlachroten Kloster. Das Defias-Gefängnis diente einst Lösegelderpressung an Adligen und soll Varian Wrynn beherbergt haben; Defias und Naga bekämpfen sich darin, das ist der Weg hinein. Die Schwarzschlund-Feste ist eine Furbolg-Stadt hinter dem nie geöffneten Tor in Azshara, deren Tunnel bis zu den Barrow Deeps reichen. Die Terrasse der Gestalter ist eine unberührte Titanenanlage in den Hügeln von Un\'Goro mit Dinosauriern, Kristallen und einer unerklärten Energiequelle.',
          'Vier weitere Dungeons folgen: zwei im Frühjahr, zwei im Sommer 2027. Aus bestimmten Dungeonbossen fallen Baupläne für die besseren Lagerobjekte der Berufe.',
          '!Gruppengröße, Bossreihen, Beute, Sperren und Schwierigkeitsgrade hat Blizzard nicht veröffentlicht. Ob die Dungeons des Originals daneben bestehen bleiben, ist nicht gesagt.',
        ],
      },
      {
        title: 'Wie Dungeons gespielt werden',
        bullets: [
          'Langsam und taktisch: Ein gewöhnlicher Gegner soll rund 15 Sekunden brauchen. Trash ist keine Formsache.',
          'Kontrolle gehört wieder zur Arbeit — Verwandlung, Verbannen, Wurzeln und Fallen zählen.',
          'Tanks sind darauf gebaut, drei oder vier Gegner sicher zu halten, nicht einen ganzen Raum. Die losen vom Heiler wegzuhalten ist Sache aller.',
          'Die Weihe des Paladins zeigt die Grenze: leichter Schaden an allem, was hineinläuft, schwerer nur an den ersten vier. Sichere Bedrohung bei einer kontrollierten Gruppe, keine gratis bei Massenpulls.',
          'Jede Beutetabelle der Dungeonbosse wurde durchgesehen: Bossbeute auf selten angehoben, schwache Gegenstände neu gebaut, neue ergänzt, die ikonischen unangetastet. Hybriden bekommen endlich Dungeon- und Questausrüstung, die für sie gemacht ist.',
        ],
      },
      {
        title: 'Schlachtzüge',
        images: [
          { file: 'raid-barrow-deeps.webp', title: 'Barrow Deeps', caption: '10 Spieler, ab 9. Dezember 2026' },
          { file: 'raid-hyjal.webp', title: 'Hyjalgipfel', caption: '20 Spieler, ab 9. Dezember 2026' },
        ],
        table: {
          columns: ['Schlachtzug', 'Spieler', 'Wann', 'Was bekannt ist'],
          rows: [
            ['Barrow Deeps', '10', '9. Dezember 2026', 'Neu; als anspruchsvolle Begegnung angekündigt'],
            ['Hyjalgipfel', '20', '9. Dezember 2026', 'Neu'],
            ['Onyxias Hort', '40', '9. Dezember 2026', 'Ob neu gebaut oder zurückgekehrt, ist offen'],
            ['Zwei Schlachtzüge', '10 und 20', 'Frühjahr 2027', 'Namen nicht angekündigt'],
            ['Ein überarbeiteter Klassiker', 'offen', 'Sommer 2027', '„Revamped iconic raid" — welcher, ist offen'],
            ['Ein neuer Schlachtzug', 'offen', 'Sommer 2027', 'Name nicht angekündigt'],
          ],
        },
        paragraphs: [
          'Barrow Deeps ist ein weit verzweigtes, heiliges Netz nachtelfischer Grabhügel mit drei Eingängen, einer davon auf dem Hyjal; die Schwarzschlund-Feste gräbt offenbar darauf zu. Die Nachtelfen halten dort ihre gefährlichsten Gefangenen — ein berühmter Dämonenjäger saß einmal darin — und nun breitet sich Verderbnis aus. Der Hyjalgipfel ist der größere Startraid: verschneite Gipfel, alte Elfenruinen, Geister aus dem Dritten Krieg. Es geht um das, was Malfurion aufgab, um Archimonde zu stoppen, und um etwas, das dem Land Kraft entzieht — vermutlich der Weg zu Forevers erstem legendären Gegenstand.',
          'Die klassischen Vanilla-Schlachtzüge existieren, sind an diesem Punkt der Zeitlinie aber noch nicht geöffnet.',
          '!Bossnamen, Reihenfolge, Sperren, Zugangsvoraussetzungen und Beuteregeln sind nicht veröffentlicht.',
        ],
      },
      {
        title: 'Schlachtfeld',
        images: [{ file: 'bg-darkspear-islands.webp', title: 'Dunkelspeerinseln', caption: 'Neues Schlachtfeld, 15 gegen 15' }],
        paragraphs: [
          'Das neue Schlachtfeld auf den Dunkelspeerinseln spielt 15 gegen 15 und ähnelt am ehesten dem Auge des Sturms: strategische Punkte halten, mit einer Flaggeninteraktion wie im Arathibecken einnehmen und verteidigen, bis die Stellung sicher ist. Die Horde kämpft an der Seite der Dunkelspeertrolle, die Allianz mit der Expeditionsstreitmacht von Theramore. Die alten Schlachtfelder bleiben. Ein größeres neues PvP-System wurde angedeutet, ohne Details; PvP-Saisons erneuern sich mit beiden Update-Wellen 2027.',
        ],
      },
    ],
  },

  // --- Systeme ---------------------------------------------------------------
  {
    slug: 'systeme',
    kicker: 'Berufe & Systeme',
    title: 'Berufe, Lager, Transmog',
    teaser: 'Über 600 neue Rezepte, ein Lagerfeuer für die Gruppe, Aussehen zum Umschalten.',
    intro:
      'Unter den Neuerungen sind einige, die den Alltag verändern: Berufe bauen Lagerobjekte, Essen bringt Erfahrung, ein Ping-System ersetzt das Rufen im Chat, und wer Transmog nicht sehen will, schaltet es ab.',
    art: 'revamps',
    heroArt: 'dustwallow',
    sections: [
      {
        title: 'Berufe',
        paragraphs: [
          'Acht Berufe sind bestätigt: Schmiedekunst, Schneiderei, Kräuterkunde, Alchemie, Lederverarbeitung, Kochkunst, Bergbau und Kürschnerei. Über 600 neue Rezepte kommen über alle Berufe und Stufen hinzu.',
          'Die Kochkunst ist grundlegend neu: gekochtes Essen gibt neben Werten auch Erfahrung — im Original gab es nur Sattheit und Regeneration.',
          'Jeder Beruf stellt drei Lagerobjekte her, freigeschaltet an Fertigkeitsschwellen, das erste ab Fertigkeit 20 beim Lehrer oder bei Lager-NPCs. Die besseren Objekte kommen als Baupläne aus Dungeonbossen.',
          'Sammelberufe bekommen Spezialisierungen: Kräuterkundige neigen zu seltenem Lotus oder zu Menge, Bergleute zu mehr Erz oder seltenen Materialien. Verzauberer lernen Ringe und Stäbe, Alchemisten längere oder stärkere Elixiere und ein aufwertbares Schmuckstück, Schneider besticken Ausrüstung für Boni. Startgebiete bekommen zusätzliche Lehrer, Rezepte und Berufsquests, damit sich ein Beruf früh lohnt.',
          '!Ob es Ingenieurskunst, Verzauberkunst, Erste Hilfe oder Angeln gibt, hat Blizzard nicht gesagt. Auch Berufslimits je Charakter und Höchstfertigkeit sind offen.',
        ],
        table: {
          columns: ['Beruf', 'Lagerobjekt (Beispiel)', 'Wirkung'],
          rows: [
            ['Schmiedekunst', 'Schleifstein', 'Angriffskraft'],
            ['Schneiderei', 'Fraktionsbanner', 'Willenskraft'],
            ['Kräuterkunde', 'Räucherkerze', 'Intelligenz'],
            ['Alchemie', 'Alchemielabor', 'Herstellen im Feld'],
            ['Lederverarbeitung', 'Gerbgestell', 'Fortgeschrittene Rezepte'],
            ['Kochkunst', 'Ausgebautes Lagerfeuer', 'Platz für fünf oder zehn Objekte'],
          ],
        },
      },
      {
        title: 'Das Lager',
        images: [
          { file: 'camping-horde.webp', title: 'Ein Horde-Lager', caption: 'Lagerfeuer mit Berufsobjekten' },
          { file: 'camping-alliance.webp', title: 'Ein Lager in der Dämmerung', caption: 'Rast, Händler, Reparatur, Werkbänke, Stärkungen' },
        ],
        paragraphs: [
          'Das Kochfeuer wird zum Lagerplatz mit Rast, Händlern, Reparatur, Berufs-Arbeitsplätzen und einstündigen Stärkungen. Man muss einen Moment am Feuer sitzen, bevor die Stärkungen wirken — die Pause ist gewollt, damit Leute miteinander reden. Lagerstärkungen teilen sich die Kategorie mit dem passenden Klassensegen: Die Räucherkerze konkurriert mit Arkane Intelligenz statt sich zu stapeln.',
          'Ein einfaches Lagerfeuer kann jeder aufschlagen. Was Berufe beisteuern, macht daraus ein Lager: die Objekte geben Stärkungen, die eine Stunde halten und für alle gelten, die am Feuer sitzen. Im Erbe-Baum der Berufe gibt es „Reiche Ernte", das die Ausbeute der Sammelberufe erhöht.',
        ],
      },
      {
        title: 'Ping und Transmog',
        bullets: [
          'Ping-System mit Radialmenü und Wegpunktmarkierungen — Absprachen ohne Chat.',
          'Transmog ist da, aber abschaltbar: wer will, sieht bei allen die tatsächlich getragene Ausrüstung. Aussehen aus Dungeons werden geteilt; die Freischaltung hängt an Stufe 60.',
        ],
      },
      {
        title: 'Grafik',
        bullets: [
          'Neue Beleuchtung mit globaler Illumination, volumetrischem Nebel und Lichtstrahlen.',
          'Gelände wirft echte Schatten, die mit dem Sonnenstand über die Gebirge wandern.',
          'Neuer Wasser-Renderer, volumetrische Partikeleffekte.',
          'Umschalter zwischen alten und hochauflösenden Charaktermodellen.',
        ],
      },
      {
        title: 'Ausrüstung und Werte',
        bullets: [
          'Trefferchance ist ein Wert über Nah-, Fern- und Zauberkampf; kritische Trefferchance ebenso.',
          'Waffenfertigkeit bleibt, aber dünner über die Gegenstände verteilt.',
          'Heilausrüstung trägt Zauberschaden, damit Heiler ohne zweites Set questen. Zauberstäbe und Stäbe geben Zauberschaden und Heilung ab etwa Stufe 10.',
          'Ein neuer Wert senkt die Chance, dass eigene Angriffe pariert oder ausgewichen werden — vor allem für Tanks. Abhärtung kommt nicht.',
          'Welt-Epics wurden überarbeitet und ergänzt; Schmuckstücke werden Situationswerkzeuge statt Allzweck-Statstöcke, manche Ausrüstung wirkt je nach Gelände oder Gegnerfamilie anders. Gedacht ist eine Sammlung, keine einzige Bestenliste.',
          'Questbelohnungen wurden verbreitert — Mor\'Ladim bietet nun auch einen Zaubermacht-Ring, Nesingwarys Reihe einen Zauberstab und ein Stärke-plus-Zauberschaden-Schwert für Vergeltung.',
          'Reitkosten wandern zur Aufteilung aus Burning Crusade: mehr Preis auf die Ausbildung, weniger auf das Reittier. Das erste Reittier bleibt ein Meilenstein.',
        ],
      },
      {
        title: 'Legacy-System',
        paragraphs: [
          'Kontoweite Fortschrittsleiste, die belohnt, den Weg von 1 bis 60 mehr als einmal zu gehen. Punkte kommen aus gewöhnlichen Leistungen — Stufe 25, 45 und 60 mit einer Klasse, Berufsmeilensteine wie Ingenieurskunst-Fachmann, Herausforderungen beim Leveln und Erkunden. Drei Kategorien: Abenteuer (Leveln und Reisen), Berufe (Sammeln und Handwerk), Findigkeit (Reibung entfernen, etwa Reagenzien für Klassenzauber).',
          'Zum Start lassen sich 16 von rund 65 verdienbaren Punkten ausgeben; alles darüber füllt eine Belohnungsleiste mit Kosmetik und Prestige. Jeder gezeigte Knoten steht im Planer.',
        ],
        link: { href: '/forever/legacy', label: 'Legacy-Baum öffnen →' },
      },
      {
        title: 'Transmog, Modelle, Licht',
        images: [
          { file: 'light-ashenvale.webp', title: 'Eschental', caption: 'Mondlicht durch die Bäume' },
          { file: 'light-orgrimmar.webp', title: 'Orgrimmar', caption: 'Neue Beleuchtung' },
          { file: 'light-darnassus.webp', title: 'Darnassus', caption: 'Neue Beleuchtung' },
          { file: 'light-tirisfal.webp', title: 'Tirisfal', caption: 'Neue Beleuchtung' },
          { file: 'zone-new-water.webp', title: 'Neues Wasser', caption: 'Der neue Wasser-Renderer' },
        ],
        bullets: [
          'Transmog gibt es, aber abschaltbar für alle anderen — per NPC oder Startvorgabe. Dann tragen andere sichtbar, was sie wirklich anhaben, das eigene Aussehen steuert man weiter selbst.',
          'Beim-Aufheben-gebundene blaue Dungeon-Ausrüstung schaltet ihr Aussehen für alle Berechtigten frei, sobald sie fällt — niemand würfelt gegen einen Transmog-Sammler. Epische Raid-Aussehen bleiben bei dem, der bindet.',
          'Nur innerhalb derselben Rüstungsklasse; ein gespeichertes Outfit hält je Platz mehrere Optionen und passt sich beim Wechsel der Rüstungsklasse an. Stufengrenzen fallen auf 60, PvP-Aussehen brauchen weiter den Rang.',
          'Ein Schalter wechselt das ganze Spiel zwischen Original- und HD-Modellen, für alle einheitlich; die klassischen Animationen wurden für die HD-Modelle wiederhergestellt. Offizielle Gamepad-Unterstützung kommt.',
        ],
      },
      {
        title: 'Hardcore',
        paragraphs: ['Forever Hardcore ist für den Winter 2026 angekündigt, ohne genaues Datum. Es ist ein abgeschlossenes Regelwerk: Fortschritt und Sammlungen lassen sich nicht hineintragen, dort verdiente Belohnungen erscheinen aber auf anderen Charakteren. Wer stirbt, darf in ein anderes Regelwerk wechseln.'],
      },
    ],
  },

  // --- Roadmap ---------------------------------------------------------------
  {
    slug: 'roadmap',
    kicker: 'Roadmap & Editionen',
    title: 'Termine und Editionen',
    teaser: 'Beta ab 17. September, Namen ab 27. Oktober, Start am 4. November.',
    intro:
      'Der Zeitplan steht bis zum Sommer 2027. Zum Spielen reicht ein laufendes WoW-Abo; die Editionen bringen die Skyborne, Betazugang und Kosmetik dazu.',
    art: 'collection',
    heroArt: 'barrens',
    sections: [
      {
        title: 'Zeitplan',
        table: {
          columns: ['Wann', 'Was'],
          rows: [
            ['12. September 2026', 'Ankündigung auf der BlizzCon'],
            ['17. September 2026', 'Beta beginnt — Stufenlimit zunächst 20, nach einigen Wochen 30'],
            ['21. oder 22. Oktober 2026', 'Beta endet (Blizzards Text und Grafik nennen verschiedene Tage)'],
            ['27. Oktober – 3. November 2026', 'Namen reservieren und Charaktere erstellen: bis zu drei je Konto, wer zuerst kommt — Namen sind nicht garantiert'],
            ['4. November 2026, 15:00 Uhr PST', 'Weltweiter Start — das ist 0:00 Uhr am 5. November bei uns'],
            ['9. Dezember 2026', 'Erste Schlachtzüge: Barrow Deeps (10), Hyjalgipfel (20), Onyxias Hort (40)'],
            ['Winter 2026', 'Forever Hardcore'],
            ['Frühjahr 2027', 'Zwei Schlachtzüge, zwei Dungeons, zwei neue Volk-Klasse-Paarungen, ein neues Spielgebiet'],
            ['Sommer 2027', 'Ein überarbeiteter Klassiker und ein neuer Schlachtzug, zwei Dungeons'],
          ],
        },
      },
      {
        title: 'Editionen',
        paragraphs: [
          'Forever selbst ist im WoW-Abo oder in Spielzeit enthalten; man braucht keine Edition, um zu spielen. Die Editionen kaufen die Skyborne und Extras dazu. Blizzard hat nur US-Preise veröffentlicht.',
        ],
        table: {
          columns: ['Edition', 'Preis (USD)', 'Inhalt'],
          rows: [
            ['Abo oder Spielzeit', 'wie gehabt', 'Zugang zu Forever ab dem 4. November, ohne Extras'],
            ['Skyborne Heroic Pack', '29,99', 'Skyborne mit Zephras-Insel, Namensreservierung, Kosmetik, ein Freundeswerbe-Code'],
            ['Skyborne Epic Pack', '59,99', 'Alles aus Heroic, dazu garantierter Betazugang ab 17. September, 30 Tage Spielzeit zum Start, weitere Kosmetik, Haustiere und Wappenröcke, drei Codes'],
            ['Warcraft Forever Collection', '79,99', 'Alles aus Epic, dazu Warcraft III: Reforged mit der Kampagne „Forsaken Kingdom" und Hausdekor für das moderne WoW; nur bis 11. Januar 2027'],
            ['Collector\'s Edition', '150,00', 'Die Collection als Code plus Statue (Zwerg und Bär, 33 cm), Mauspad, Drucke, Anstecker, Notizbuch — seit 13. September ausverkauft'],
          ],
        },
      },
      {
        title: 'Angedeutet, nicht angekündigt',
        paragraphs: ['Auf der Bühne erwähnt, ohne Einzelheiten — Richtung, keine Versprechen.'],
        bullets: [
          'Grim Batol und eine wachsende Präsenz roter Drachen.',
          'Mehr Azshara, samt dem großen ungenutzten Krater.',
          'Ein überarbeiteter Vanilla-Schlachtzug und Forevers erster legendärer Gegenstand.',
          'Ein größeres, neu gestaltetes PvP-System; weitere Legacy-Bäume und Knoten.',
          'Weitere Volk-Klasse-Paarungen und vielleicht eine ganz neue Klasse — nicht ausgeschlossen, nichts angekündigt.',
          'Smaragdgrüner Traum, Höhlen der Zeit, Uldum, Gilneas und andere unfertige Vanilla-Gebiete kamen als kreative Möglichkeiten zur Sprache, nicht als Plan.',
        ],
      },
      {
        title: 'Was noch offen ist',
        bullets: [
          'Europäische Preise der Editionen.',
          'Bis wann Heroic und Epic Pack erhältlich sind.',
          'Ob die Collection nach dem 11. Januar 2027 zurückkehrt.',
        ],
      },
    ],
  },
];

WISSEN_TOPICS.push({
  slug: 'grundsaetze',
  kicker: 'Grundsätze',
  title: 'Was Forever eigentlich ist',
  teaser: 'Kein Neustart, keine Erweiterung: ein Azeroth, das in seinem ersten Jahr bleibt und seitwärts wächst.',
  intro:
    'Forever beginnt im selben Moment wie das Spiel von 2004 und behält jede ursprüngliche Quest. Neues wird in die Welt hineingewoben statt sie zu ersetzen. Die Zeit ist im ersten Jahr versiegelt: nach dem Dritten Krieg, vor dem Dunklen Portal, vor Nordend — eine eigene Kontinuität neben Retail und Classic Era.',
  art: 'stories',
  heroArt: 'mulgore',
  sections: [
    {
      title: 'Die Leitlinien',
      bullets: [
        'Stufe 60 ist die Decke, und sie soll nicht steigen. Fortschritt kommt aus neuen Orten, Gegenständen, Rufen, Berufen und Builds statt aus neuen Stufen.',
        'Kein Fliegen, keine Stufenanpassung. Jedes Gebiet behält seine Schwierigkeit — wohin man geht, ist eine echte Entscheidung.',
        'Nichts, was man verdient, wird vom nächsten Patch entwertet. Es gibt keinen Erweiterungszyklus, der Ausrüstung leise wertlos macht.',
        'Leveln ist die Hauptsache, nicht die Warteschlange vor dem Endgame. Der Aufholplan für einen neuen Charakter heißt: spielen.',
        'Klassen werden nicht aneinander angeglichen. Spezialisierungen behalten Kanten, statt dass jede Klasse von allem etwas bekommt.',
        'Patches sollen mehrere Spielertypen zugleich bedienen: Solo-Geschichten, Levelinhalte, Dungeons, Schlachtzüge, PvP, Berufe, Weltinhalte.',
        'Die Warcraft-Geschichte gilt weiter: Arthas auf dem Frostthron und Archimondes Fall am Hyjal sind Kulisse, nichts wird rückgängig gemacht.',
      ],
    },
    {
      title: 'Wie die Geschichten geschrieben werden',
      paragraphs: [
        'Das Bild, das Blizzard dafür benutzt: gefundene Fotografien — Dinge, die in Vanilla glaubhaft hätten passieren können, aber nie gezeigt wurden. Unterbeleuchtete Figuren werden ausgebaut, berühmte Leute bei dem gezeigt, was sie abseits der Bühne taten, verschlossene Orte geöffnet, verlaufene Lokalgeschichten zu Ende erzählt.',
        'Neue Rätsel sind wichtiger als saubere Antworten auf alte, und große Ereignisse werden vom Boden aus erzählt statt als eine lange Kampagne mit dem Starensemble. Inhalte fallen in drei Töpfe: erwartete Orte wie Hyjal, neue Geschichten aus vertrautem Warcraft-Material, und echte Überraschungen wie die Skyborne — sparsam eingesetzt, damit das klassische Azeroth es selbst bleibt.',
      ],
    },
    {
      title: 'Die Zahlen der Ankündigung',
      table: {
        columns: ['Was', 'Wie viel'],
        rows: [
          ['Neue Regionen', 'vier, dazu der wiederbelebte Hyjal'],
          ['Neue Quests', 'über 1.000, von 1 bis 60 verteilt'],
          ['Neue Dungeons', 'neun zum Start, vier weitere 2027'],
          ['Schlachtzüge zum Start', 'zwei neue plus Onyxias Hort, ab 9. Dezember'],
          ['Talente', '470 in 27 Bäumen, davon 131 neu'],
          ['Volksfähigkeiten', '37 über neun Völker, je zwei aktiv und zwei passiv'],
          ['Neue Rezepte', 'über 600'],
          ['Regelwerke', 'Normal, PvP, Rollenspiel, später Hardcore'],
        ],
      },
    },
    {
      title: 'Zu den Zahlen',
      paragraphs: [
        '!Forever wurde gezeigt, nicht ausgeliefert. Tooltips stammen von Messe-Charakteren um Stufe 38; Schadens- und Manazahlen sind nicht die einer Stufe 60, und Formulierungen ändern sich zwischen Messe und Beta. Ab dem 17. September liefert der Beta-Client die verlässlicheren Daten.',
      ],
    },
  ],
});

export function topicBySlug(slug: string): Topic | undefined {
  return WISSEN_TOPICS.find((topic) => topic.slug === slug);
}
