# INA Analytics

Gilden-Statistikplattform auf Basis der **Warcraft Logs API v2**. Importiert die
Log-Historie der Gilde über alle Classic-Erweiterungen hinweg, hält sie dauerhaft
vor und erzeugt daraus Ranglisten, Rekorde und Spielerprofile — pro Charakter
**und** pro Person.

Der Plan mit Datenmodell, Meilensteinen und Designentscheidungen liegt unter
`C:\Users\Frede\.claude\plans\twinkling-baking-bird.md`.

---

## Grundregel: keine erfundenen API-Felder

Das GraphQL-Schema wird **live von Warcraft Logs eingelesen**, nach
`packages/wcl/schema.graphql` geschrieben und eingecheckt. Jede Query in
`packages/wcl/src/operations.ts` wird beim Codegen dagegen validiert.

Ein Feld, das es nicht gibt, bricht den Build:

```
✖ Generate [FAILED: Cannot query field "totallyMadeUpField" on type "RateLimitData".
```

Das ist kein Versprechen, sondern erzwungen. Nach jeder Änderung an den Queries
`pnpm codegen` laufen lassen; nach einer API-Änderung bei Warcraft Logs
zusätzlich `pnpm wcl:introspect` — der Diff der Schemadatei zeigt dann genau,
was sich geändert hat.

---

## Einrichtung

Voraussetzungen: Node ≥ 22, pnpm, Docker Desktop.

```bash
pnpm install
cp .env.example .env
```

In `.env` eintragen:

| Variable | Woher |
|---|---|
| `WCL_CLIENT_ID`, `WCL_CLIENT_SECRET` | warcraftlogs.com/api/clients → Abschnitt **v2 Clients** → *Create Client*. Ein v1-API-Key funktioniert **nicht**. |
| `GUILD_NAME`, `GUILD_SERVER_SLUG`, `GUILD_SERVER_REGION` | Aus der Gilden-URL auf warcraftlogs.com. Der Slug ist der kleingeschriebene Realmname mit Bindestrichen. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Frei wählbar, Passwort mindestens 12 Zeichen. |

Datenbank starten und einrichten:

```bash
docker compose -f docker/docker-compose.yml up -d
pnpm db:migrate
pnpm --filter @ina/db run seed
```

Verbindung zur API prüfen:

```bash
pnpm wcl:ping
```

Ausgabe zeigt Punktebudget, die aufgelöste Gilde und die auf diesem Host
sichtbaren Erweiterungen. Schlägt das fehl, liegt es an Credentials, Host oder
Gildenkonfiguration — nicht am Importer.

Entwicklungsserver:

```bash
pnpm dev
```

- App: http://localhost:3100
- Design-Referenz: http://localhost:3100/design-system

> Port 3100 statt 3000, weil auf diesem Rechner ein anderes Projekt auf 3000 läuft.

---

## Struktur

```
apps/
  web/         Next.js 16 — UI, Read-API, Admin
  worker/      pg-boss Worker: Import und Aggregation (ab M2)
packages/
  db/          Prisma-Schema, Migrationen, Seed
  wcl/         Warcraft-Logs-Client: OAuth, Rate-Limit, Queries, Codegen
  core/        Domänenlogik: Metriken, Formeln, Einstellungen (framework-frei)
  contracts/   Austauschformat für externe Quellen (RaidBrain, ab M7)
docker/
  docker-compose.yml
```

Der Worker ist ein eigener Prozess, weil ein Vollimport über Jahre an Logs
stundenlang läuft — das gehört nicht in einen HTTP-Request.

---

## Befehle

| Befehl | Wirkung |
|---|---|
| `pnpm dev` | Next.js-Entwicklungsserver auf Port 3100 |
| `pnpm dev:worker` | Import-Worker |
| `pnpm typecheck` | Typprüfung über alle Pakete |
| `pnpm wcl:introspect` | Schema live von Warcraft Logs holen |
| `pnpm codegen` | TypeScript-Typen aus dem Schema erzeugen |
| `pnpm wcl:ping` | Live-Check: Credentials, Budget, Gilde |
| `pnpm db:migrate` | Migration erstellen und anwenden |
| `pnpm db:studio` | Prisma Studio |

---

## Verifizierte API-Fakten

Aus der Live-Introspection, nicht aus dem Gedächtnis:

- Token: `POST https://www.warcraftlogs.com/oauth/token`, `client_credentials`, HTTP-Basic
- GraphQL: `<host>/api/v2/client` — Classic-Daten liegen auf `classic.warcraftlogs.com`
- Budget: `rateLimitData { limitPerHour pointsSpentThisHour pointsResetIn }` — **3600 Punkte/Stunde**, fraktional verbraucht
- Auf dem Classic-Host sichtbar: Classic (1000), TBC (1001), WotLK (1002), Cataclysm (1003), Mists of Pandaria (1004)
- `ReportFight.startTime/endTime` sind **Offsets relativ zum Report-Start**, keine absoluten Zeitstempel
- `friendlyPlayers` / `friendlySpecs` / `friendlyItemLevels` sind indexgleiche Parallel-Arrays
- `Report.table()` und `Report.rankings()` liefern untypisiertes `JSON` — die Struktur wird im Importer zur Laufzeit validiert, nicht angenommen
- `Expansion` hat **keine** Start-/Enddaten; die werden aus Report-Zeitstempeln abgeleitet

---

## Design

WoW-Classic-Optik, fraktionsneutral, Gold auf Schwarz. Ornamentrahmen an
Schauseiten, ruhige Tabellen auf Arbeitsseiten — sonst ist eine 500-Zeilen-
Rangliste unlesbar. `/design-system` zeigt beides nebeneinander und dient als
Referenz.

**Es wird kein Bildmaterial aus dem Spielclient verwendet.** Alle Rahmen,
Eckbeschläge und Zierlinien sind in CSS/SVG nachgebaut; als Display-Schrift
dient Marcellus, eine frei lizenzierte Alternative zur lizenzpflichtigen Friz
Quadrata.

---

## Stand

Abgeschlossen: **M0 — Fundament und Schema-Verifikation.**
Workspace, Postgres, vollständiges Prisma-Datenmodell (22 Tabellen), OAuth-Client
mit Rate-Limiter und Retry, Live-Introspection mit Codegen-Schutz, Design-System.

Als Nächstes: **M2 — Referenzdaten und Report-Import** (M1 ist mit `wcl:ping`
bereits belegt).
