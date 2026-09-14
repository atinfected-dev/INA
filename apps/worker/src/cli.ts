/**
 * Worker CLI.
 *
 * Runs a single import step directly, without going through the queue. Used
 * during development and for one-off operational tasks; the admin UI will
 * enqueue the same functions once pg-boss is wired up in M2.
 *
 *   pnpm --filter @ina/worker run cli reference
 */
import { loadEnv } from './env';
import { prisma } from '@ina/db';
import { WclClient, remainingPoints } from '@ina/wcl';
import { importReferenceData } from './import/reference';
import { importReport } from './import/report';
import { discoverReports } from './import/discover';
import { runSync } from './import/sync';
import { importRankings } from './import/rankings';
import { importDeaths } from './import/deaths';
import { GuildByNameDocument, GuildReportsDocument } from '@ina/wcl';

const COMMANDS = [
  'reference',
  'report',
  'discover',
  'sync',
  'guild',
  'analyze',
  'deaths',
] as const;
type Command = (typeof COMMANDS)[number];

function isCommand(value: string | undefined): value is Command {
  return value !== undefined && (COMMANDS as readonly string[]).includes(value);
}

async function runReference(): Promise<void> {
  const client = new WclClient();
  const before = await client.getRateLimit();

  console.log(`Importing reference data from ${client.apiHost} …\n`);
  const result = await importReferenceData(client);

  const row = (label: string, counts: { created: number; updated: number }): void => {
    console.log(`  ${label.padEnd(14)} ${String(counts.created).padStart(5)} neu   ${String(counts.updated).padStart(5)} aktualisiert`);
  };

  row('Expansions', result.expansions);
  row('Zones', result.zones);
  row('Encounters', result.encounters);
  row('Difficulties', result.difficulties);

  if (result.difficultyNameConflicts.length > 0) {
    // Reported rather than resolved: the same difficulty id genuinely carries
    // different labels in different zones, and picking one silently would make
    // the UI lie about at least one of them.
    console.log('\n  Difficulty-Namen weichen zwischen Zonen ab:');
    for (const conflict of result.difficultyNameConflicts) console.log(`    ${conflict}`);
  }

  const after = await client.getRateLimit();
  console.log(
    `\n  Punkte verbraucht: ${(after.pointsSpentThisHour - before.pointsSpentThisHour).toFixed(1)}` +
      ` · verbleibend: ${remainingPoints(after).toFixed(0)}`,
  );
}

async function runReport(code: string | undefined, force: boolean): Promise<void> {
  if (!code) {
    console.error('Usage: cli report <reportCode> [--force]');
    process.exitCode = 1;
    return;
  }

  const client = new WclClient();
  const before = await client.getRateLimit();

  console.log(`Importing report ${code} …
`);
  const result = await importReport(code, client, { force });

  if (result.skipped) {
    console.log(`  übersprungen: ${result.skippedReason}`);
  } else {
    console.log(`  Fights          ${result.fights}`);
    console.log(`  Charaktere neu  ${result.charactersCreated}`);
    console.log(`  Teilnahmen neu  ${result.participants}`);
  }

  if (result.unknownEncounterIds.length > 0) {
    // The reference data is out of date rather than the log being wrong.
    console.log(
      `
  Unbekannte Encounter-IDs: ${result.unknownEncounterIds.join(', ')}` +
        `
  -> "pnpm import:reference" ausführen.`,
    );
  }

  const after = await client.getRateLimit();
  console.log(
    `
  Punkte verbraucht: ${(after.pointsSpentThisHour - before.pointsSpentThisHour).toFixed(1)}` +
      ` · verbleibend: ${remainingPoints(after).toFixed(0)}`,
  );
}

/**
 * Resolves the guild a command operates on.
 *
 * Without --guild= this is the default guild. A guild that renamed keeps its
 * old logs under the old name, so both are separate Guild rows and each needs
 * its own sync; --guild= picks one by name (case-insensitive).
 */
async function requireGuild(nameFilter?: string) {
  if (nameFilter) {
    const match = await prisma.guild.findFirst({
      where: { name: { equals: nameFilter, mode: 'insensitive' } },
    });
    if (!match) {
      const known = await prisma.guild.findMany({ select: { name: true } });
      throw new Error(
        `No guild named "${nameFilter}". Known: ${known.map((g) => g.name).join(', ') || '(none)'}.`,
      );
    }
    return match;
  }

  const guild =
    (await prisma.guild.findFirst({ where: { isDefault: true } })) ??
    (await prisma.guild.findFirst());

  if (!guild) {
    throw new Error(
      'No guild configured. Set GUILD_NAME, GUILD_SERVER_SLUG and ' +
        'GUILD_SERVER_REGION in .env, then run "pnpm --filter @ina/db run seed".',
    );
  }
  return guild;
}

/**
 * A readable one-liner for any thrown value.
 *
 * Some errors carry an empty message — printing only `error.message` then logs
 * "FEHLER:" and nothing else, which is useless for diagnosis. The name is
 * always included.
 */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    const detail = error.message.trim();
    return detail === '' ? `${error.name} (ohne Meldung)` : `${error.name}: ${detail.slice(0, 160)}`;
  }
  return String(error).slice(0, 160);
}

/** Reads --guild=<name> from argv. */
function guildArg(): string | undefined {
  const arg = process.argv.find((a) => a.startsWith('--guild='));
  return arg ? arg.slice('--guild='.length) : undefined;
}

async function runDiscover(full: boolean, maxPages: number | undefined): Promise<void> {
  const guild = await requireGuild(guildArg());
  const client = new WclClient();
  const before = await client.getRateLimit();

  console.log(
    `Discovering reports for ${guild.name} — ${guild.serverSlug} (${guild.serverRegion})` +
      `${full ? ', full history' : ''} …
`,
  );

  const result = await discoverReports(guild, client, { full, maxPages });

  console.log(`  Modus           ${result.type}`);
  console.log(
    `  ab              ${result.fromTime === 0 ? 'Anfang' : new Date(result.fromTime).toISOString().slice(0, 10)}`,
  );
  console.log(`  Seiten          ${result.pages}`);
  console.log(`  Reports gesehen ${result.seen}`);
  console.log(`  davon neu       ${result.created}`);
  console.log(`  neue Revision   ${result.revised}`);

  const pending = await prisma.report.count({
    where: { guildId: guild.id, importState: 'DISCOVERED' },
  });
  console.log(`
  Offen für den Inhalts-Import: ${pending}`);

  const after = await client.getRateLimit();
  console.log(
    `
  Punkte verbraucht: ${(after.pointsSpentThisHour - before.pointsSpentThisHour).toFixed(1)}` +
      ` · verbleibend: ${remainingPoints(after).toFixed(0)}`,
  );
}

async function runSyncCommand(
  full: boolean,
  importOnly: boolean,
  limit: number | undefined,
): Promise<void> {
  const guild = await requireGuild(guildArg());
  const client = new WclClient();
  const started = Date.now();

  console.log(
    `Sync für ${guild.name} — ${guild.serverSlug} (${guild.serverRegion})` +
      `${full ? ', volle Historie' : ''}
`,
  );

  const result = await runSync(guild, client, {
    full,
    importOnly,
    limit,
    onProgress: (p) => {
      const state = p.failed ? 'FEHLER' : p.skipped ? 'übersprungen' : `${p.fights} Fights`;
      // One line per report: at 361 reports a progress bar would hide which
      // specific log failed, which is the thing worth seeing.
      console.log(`  [${String(p.index).padStart(3)}/${p.total}] ${p.code}  ${state}`);
    },
  });

  const minutes = ((Date.now() - started) / 60_000).toFixed(1);
  console.log(`
  Neue Reports    ${result.discovered}`);
  console.log(`  Importiert      ${result.imported}`);
  console.log(`  Übersprungen    ${result.skipped}`);
  console.log(`  Fehlgeschlagen  ${result.failed}`);
  console.log(`  Fights gesamt   ${result.fights}`);
  console.log(`  Punkte          ${result.pointsSpent.toFixed(1)}`);
  console.log(`  Dauer           ${minutes} min`);
}

/**
 * Looks up a guild on Warcraft Logs and reports how much history it has.
 *
 * Used to check a guild's earlier name or realm before deciding to add it: a
 * guild that renamed keeps its old logs under the old name, and those reports
 * are only reachable through that name.
 */
async function runGuildLookup(
  name: string | undefined,
  serverSlug: string | undefined,
  serverRegion: string | undefined,
  add: boolean,
): Promise<void> {
  if (!name || !serverSlug || !serverRegion) {
    console.error('Usage: cli guild <name> <serverSlug> <region> [--add]');
    process.exitCode = 1;
    return;
  }

  const client = new WclClient();
  const found = await client.query(GuildByNameDocument, { name, serverSlug, serverRegion });
  const guild = found.guildData?.guild;

  if (!guild) {
    console.log(`
Nicht gefunden: "${name}" auf ${serverSlug} (${serverRegion}).`);
    process.exitCode = 1;
    return;
  }

  console.log(`
  id        ${guild.id}`);
  console.log(`  name      ${guild.name}`);
  console.log(`  faction   ${guild.faction.name}`);
  console.log(`  server    ${guild.server.name} (${guild.server.slug})`);
  console.log(`  region    ${guild.server.region.slug}`);

  // One page is enough to tell whether there is history worth importing.
  const reports = await client.query(GuildReportsDocument, {
    guildName: guild.name,
    guildServerSlug: guild.server.slug,
    guildServerRegion: guild.server.region.slug,
    startTime: 0,
    limit: 100,
    page: 1,
  });

  const page = reports.reportData?.reports;
  const rows = (page?.data ?? []).filter((r) => r !== null);
  const oldest = rows.at(-1);
  const newest = rows.at(0);

  console.log(`
  Reports (Seite 1)  ${rows.length}${page?.has_more_pages ? ' (mehr vorhanden)' : ''}`);
  if (newest && oldest) {
    console.log(`  neuester           ${new Date(newest.startTime).toISOString().slice(0, 10)}`);
    console.log(`  ältester (S.1)     ${new Date(oldest.startTime).toISOString().slice(0, 10)}`);
  }

  if (add) {
    const row = await prisma.guild.upsert({
      where: { wclGuildId: guild.id },
      update: {
        name: guild.name,
        serverSlug: guild.server.slug,
        serverRegion: guild.server.region.slug,
        faction: guild.faction.name,
      },
      create: {
        wclGuildId: guild.id,
        name: guild.name,
        serverSlug: guild.server.slug,
        serverRegion: guild.server.region.slug,
        faction: guild.faction.name,
      },
    });
    console.log(`
  In die Datenbank aufgenommen (${row.id}).`);
  }
}

/**
 * Second import pass: parse percentiles and per-fight performance.
 *
 * Runs after the fights are in, because it needs the fight rows to attach to.
 * Costs about 42 points per report (two rankings calls), so a full backfill is
 * measured in hours of hourly budget rather than minutes.
 */
async function runAnalyze(limit: number | undefined, force: boolean): Promise<void> {
  const guild = await requireGuild(guildArg());

  // A full backfill outlives several hourly budgets. Report every pause, or the
  // process looks hung for up to an hour at a time.
  let pauses = 0;
  const client = new WclClient({
    onRateLimit: (snapshot) => {
      pauses += 1;
      const until = new Date(Date.now() + snapshot.pointsResetIn * 1000);
      console.log(
        `  ⏸  Punktebudget erschöpft — warte bis ${until.toLocaleTimeString('de-DE')} ` +
          `(${Math.round(snapshot.pointsResetIn / 60)} min)`,
      );
    },
  });

  const before = await client.getRateLimit().catch(() => null);
  const started = Date.now();

  const pending = await prisma.report.findMany({
    where: {
      guildId: guild.id,
      ...(force ? {} : { importState: 'FIGHTS_IMPORTED' }),
    },
    orderBy: { startTime: 'asc' },
    select: { code: true },
    ...(limit === undefined ? {} : { take: limit }),
  });

  console.log(`Analyse für ${guild.name}: ${pending.length} Reports
`);

  let fights = 0;
  let parses = 0;
  let performances = 0;
  let skipped = 0;
  let failed = 0;
  const unresolved = new Set<string>();

  for (const [index, report] of pending.entries()) {
    try {
      const r = await importRankings(report.code, client, { force });
      if (r.skipped) {
        skipped += 1;
      } else {
        fights += r.fights;
        parses += r.parses;
        performances += r.performances;
        for (const u of r.unresolvedCharacters) unresolved.add(u);
      }
      console.log(
        `  [${String(index + 1).padStart(3)}/${pending.length}] ${report.code}  ` +
          (r.skipped ? `übersprungen: ${r.skippedReason}` : `${r.fights} Kills, ${r.parses} Parses`),
      );
    } catch (error) {
      failed += 1;
      console.log(
        `  [${String(index + 1).padStart(3)}/${pending.length}] ${report.code}  FEHLER: ` +
          describeError(error),
      );
    }
  }

  const after = await client.getRateLimit().catch(() => null);
  console.log(`
  Kills analysiert  ${fights}`);
  console.log(`  Parses            ${parses}`);
  console.log(`  Leistungsdaten    ${performances}`);
  console.log(`  Übersprungen      ${skipped}`);
  console.log(`  Fehlgeschlagen    ${failed}`);
  if (unresolved.size > 0) {
    console.log(`  Nicht zuordenbar  ${unresolved.size} Charaktere`);
  }
  if (pauses > 0) console.log(`  Budget-Pausen     ${pauses}`);
  if (after) {
    console.log(
      `  Punkte übrig      ${remainingPoints(after).toFixed(0)} von ${after.limitPerHour}`,
    );
  }
  console.log(`  Dauer             ${((Date.now() - started) / 60_000).toFixed(1)} min`);
}

/**
 * Third import pass: individual death events.
 *
 * About 4 points per report, so the whole history costs roughly 3.000 points.
 * Re-runs replace a report's deaths rather than appending them.
 */
async function runDeaths(limit: number | undefined): Promise<void> {
  const guild = await requireGuild(guildArg());
  const client = new WclClient({
    onRateLimit: (snapshot) => {
      const until = new Date(Date.now() + snapshot.pointsResetIn * 1000);
      console.log(`  ⏸  Punktebudget erschöpft — warte bis ${until.toLocaleTimeString('de-DE')}`);
    },
  });
  const started = Date.now();

  const reports = await prisma.report.findMany({
    where: { guildId: guild.id, fights: { some: {} } },
    orderBy: { startTime: 'asc' },
    select: { code: true },
    ...(limit === undefined ? {} : { take: limit }),
  });

  console.log(`Todesdaten für ${guild.name}: ${reports.length} Reports
`);

  let deaths = 0;
  let withoutCause = 0;
  let skipped = 0;
  let archived = 0;
  let failed = 0;

  for (const [index, report] of reports.entries()) {
    try {
      const r = await importDeaths(report.code, client);
      if (r.archived) archived += 1;
      else if (r.skipped) skipped += 1;
      else {
        deaths += r.deaths;
        withoutCause += r.withoutCause;
      }
      if ((index + 1) % 25 === 0 || index + 1 === reports.length) {
        console.log(`  [${String(index + 1).padStart(3)}/${reports.length}] ${deaths} Tode bisher`);
      }
    } catch (error) {
      failed += 1;
      console.log(`  [${String(index + 1).padStart(3)}/${reports.length}] ${report.code}  FEHLER: ${describeError(error)}`);
    }
  }

  console.log(`
  Tode              ${deaths}`);
  console.log(`  ohne Ursache      ${withoutCause}`);
  console.log(`  Archiviert        ${archived}`);
  console.log(`  Übersprungen      ${skipped}`);
  console.log(`  Fehlgeschlagen    ${failed}`);
  console.log(`  Dauer             ${((Date.now() - started) / 60_000).toFixed(1)} min`);
}

async function main(): Promise<void> {
  loadEnv();

  const command = process.argv[2];
  if (!isCommand(command)) {
    console.error(`Usage: cli <${COMMANDS.join('|')}>`);
    process.exitCode = 1;
    return;
  }

  switch (command) {
    case 'reference':
      await runReference();
      break;
    case 'report':
      await runReport(process.argv[3], process.argv.includes('--force'));
      break;
    case 'guild':
      await runGuildLookup(
        process.argv[3],
        process.argv[4],
        process.argv[5],
        process.argv.includes('--add'),
      );
      break;
    case 'deaths': {
      const limitArg = process.argv.find((a) => a.startsWith('--limit='));
      await runDeaths(limitArg ? Number(limitArg.split('=')[1]) : undefined);
      break;
    }
    case 'analyze': {
      const limitArg = process.argv.find((a) => a.startsWith('--limit='));
      await runAnalyze(
        limitArg ? Number(limitArg.split('=')[1]) : undefined,
        process.argv.includes('--force'),
      );
      break;
    }
    case 'sync': {
      const limitArg = process.argv.find((a) => a.startsWith('--limit='));
      await runSyncCommand(
        process.argv.includes('--full'),
        process.argv.includes('--import-only'),
        limitArg ? Number(limitArg.split('=')[1]) : undefined,
      );
      break;
    }
    case 'discover': {
      const pagesArg = process.argv.find((a) => a.startsWith('--max-pages='));
      const maxPages = pagesArg ? Number(pagesArg.split('=')[1]) : undefined;
      await runDiscover(process.argv.includes('--full'), maxPages);
      break;
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
