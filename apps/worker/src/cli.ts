/**
 * Worker CLI.
 *
 * Runs a single import step directly, without going through the queue. Used
 * during development and for one-off operational tasks; the admin UI will
 * enqueue the same functions once pg-boss is wired up in M2.
 *
 *   pnpm --filter @ina/worker run cli reference
 */
import { loadEnv } from './env.js';
import { prisma } from '@ina/db';
import { WclClient, remainingPoints } from '@ina/wcl';
import { importReferenceData } from './import/reference.js';
import { importReport } from './import/report.js';
import { discoverReports } from './import/discover.js';
import { runSync } from './import/sync.js';

const COMMANDS = ['reference', 'report', 'discover', 'sync'] as const;
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

/** Resolves the guild the CLI operates on: the default one, else the only one. */
async function requireGuild() {
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

async function runDiscover(full: boolean, maxPages: number | undefined): Promise<void> {
  const guild = await requireGuild();
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
  const guild = await requireGuild();
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
