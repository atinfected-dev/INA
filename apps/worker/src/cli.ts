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

const COMMANDS = ['reference'] as const;
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
  }
}

main()
  .catch((error: unknown) => {
    console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
