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

export interface Table {
  columns: string[];
  rows: string[][];
}

export interface Section {
  title: string;
  /** Paragraphs, plain text; a leading "!" marks a note about what is unknown. */
  paragraphs?: string[];
  bullets?: string[];
  table?: Table;
}

export interface Topic {
  slug: string;
  kicker: string;
  title: string;
  teaser: string;
  intro: string;
  /** Blizzard zone slug on the render CDN. */
  art: string;
  sections: Section[];
}

export const WISSEN_STAND = '15. September 2026';

export const WISSEN_TOPICS: Topic[] = [
  // --- Völker ----------------------------------------------------------------
  {
    slug: 'voelker',
    kicker: 'Völker',
    title: 'Neun Völker',
    teaser: 'Acht Bekannte, ein neues — und sechs Paarungen, die es nie gab.',
    intro:
      'Forever bringt die acht Völker von 2004 zurück und stellt ihnen die Skyborne zur Seite, ein Elfenvolk, das sich beim Erstellen für eine Seite entscheidet. Sechs Volk-Klasse-Paarungen sind neu; zwei weitere hat Blizzard für das Frühjahr angekündigt, ohne zu sagen, welche.',
    art: 'zulgurub',
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
        ],
        table: {
          columns: ['Für beide Seiten', 'Nur Allianz', 'Nur Horde'],
          rows: [['Krieger, Jäger, Schurke, Druide', 'Magier', 'Schamane']],
        },
      },
      {
        title: 'Volksfähigkeiten',
        paragraphs: [
          'Jedes Volk erhält zwei aktive und zwei passive Fähigkeiten. Für die Orcs hat Blizzard „überarbeitete Volksfähigkeiten" für Stärke und Nutzen angekündigt.',
          '!Welche Fähigkeiten das im Einzelnen sind, hat Blizzard für kein Volk veröffentlicht — auch nicht für die Skyborne. Was in Foren kursiert, ist Spekulation und steht hier nicht.',
        ],
      },
      {
        title: 'Was noch offen ist',
        bullets: [
          'Die genauen Volksfähigkeiten aller neun Völker.',
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
    art: 'molten-core',
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
    art: 'onyxias-lair',
    sections: [
      {
        title: 'Neue Gebiete',
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
          'Ausgebaut werden unter anderem das Sumpfland (neue Quests) und Desolace (neue Zentaurenquests mit Belohnungen). Blizzard spricht von drei neuen Gebieten; Berichte nennen vier — ob Hyjal oder Shen\'dralas als Erweiterung eines alten Gebiets zählt, ist offen.',
        ],
      },
      {
        title: 'Dungeons zum Start',
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
          'Vier weitere Dungeons folgen: zwei im Frühjahr, zwei im Sommer 2027. Aus bestimmten Dungeonbossen fallen Baupläne für die besseren Lagerobjekte der Berufe.',
          '!Gruppengröße, Bossreihen, Beute, Sperren und Schwierigkeitsgrade hat Blizzard nicht veröffentlicht. Ob die Dungeons des Originals daneben bestehen bleiben, ist nicht gesagt.',
        ],
      },
      {
        title: 'Schlachtzüge',
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
          '!Bossnamen, Reihenfolge, Sperren, Zugangsvoraussetzungen und Beuteregeln sind nicht veröffentlicht.',
        ],
      },
      {
        title: 'Schlachtfeld',
        paragraphs: ['Ein neues Schlachtfeld auf den Dunkelspeerinseln. Mehr hat Blizzard dazu nicht gesagt.'],
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
    art: 'naxxramas',
    sections: [
      {
        title: 'Berufe',
        paragraphs: [
          'Acht Berufe sind bestätigt: Schmiedekunst, Schneiderei, Kräuterkunde, Alchemie, Lederverarbeitung, Kochkunst, Bergbau und Kürschnerei. Über 600 neue Rezepte kommen über alle Berufe und Stufen hinzu.',
          'Die Kochkunst ist grundlegend neu: gekochtes Essen gibt neben Werten auch Erfahrung — im Original gab es nur Sattheit und Regeneration.',
          'Jeder Beruf stellt drei Lagerobjekte her, freigeschaltet an Fertigkeitsschwellen, das erste ab Fertigkeit 20 beim Lehrer oder bei Lager-NPCs. Die besseren Objekte kommen als Baupläne aus Dungeonbossen.',
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
        paragraphs: [
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
        title: 'Hardcore',
        paragraphs: ['Forever Hardcore ist für den Winter 2026 angekündigt, ohne genaues Datum.'],
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
    art: 'blackwing-lair',
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

export function topicBySlug(slug: string): Topic | undefined {
  return WISSEN_TOPICS.find((topic) => topic.slug === slug);
}
