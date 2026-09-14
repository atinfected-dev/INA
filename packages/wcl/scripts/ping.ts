/**
 * Connectivity check against the live Warcraft Logs API.
 *
 * Proves four things in one run: the OAuth credentials work, the configured
 * host answers, the point budget is readable, and - if GUILD_* is configured -
 * the guild actually resolves. Run this before blaming the importer.
 */
import { loadRootEnv } from './env';
import { WclClient } from '../src/client';
import { remainingPoints } from '../src/rate-limit';
import { GuildByNameDocument, WorldReferenceDocument } from '../src/operations';

function line(label: string, value: string | number): void {
  console.log(`  ${label.padEnd(22)} ${value}`);
}

async function main(): Promise<void> {
  loadRootEnv();

  const client = new WclClient({ waitForRateLimitReset: false });
  console.log(`\nWarcraft Logs API v2 — ${client.apiHost}\n`);

  const budget = await client.getRateLimit();
  console.log('Rate limit');
  line('limit per hour', budget.limitPerHour);
  line('spent this hour', budget.pointsSpentThisHour);
  line('remaining', remainingPoints(budget));
  line('resets in', `${Math.round(budget.pointsResetIn / 60)} min`);

  const name = process.env.GUILD_NAME?.trim();
  const serverSlug = process.env.GUILD_SERVER_SLUG?.trim();
  const serverRegion = process.env.GUILD_SERVER_REGION?.trim();

  if (!name || !serverSlug || !serverRegion) {
    console.log(
      '\nGuild lookup skipped — set GUILD_NAME, GUILD_SERVER_SLUG and ' +
        'GUILD_SERVER_REGION in .env to verify the guild configuration.',
    );
  } else {
    const result = await client.query(GuildByNameDocument, { name, serverSlug, serverRegion });
    const guild = result.guildData?.guild;

    if (!guild) {
      console.log(`\nGuild NOT FOUND: "${name}" on ${serverSlug} (${serverRegion}).`);
      console.log(
        '  The server slug is the lowercase, hyphenated realm name as it appears in a\n' +
          '  warcraftlogs.com guild URL. Note that Classic guilds only resolve on the\n' +
          '  Classic host — check WCL_API_HOST.',
      );
      process.exitCode = 1;
    } else {
      console.log('\nGuild');
      line('id', guild.id);
      line('name', guild.name);
      line('faction', guild.faction.name);
      line('server', `${guild.server.name} (${guild.server.slug})`);
      line('region', guild.server.region.slug);
    }
  }

  // A cheap sanity check that reference data is reachable, since every import
  // depends on it.
  const world = await client.query(WorldReferenceDocument, {});
  const expansions = world.worldData?.expansions ?? [];
  console.log(`\nReference data — ${expansions.length} expansions visible on this host`);
  for (const expansion of expansions) {
    if (!expansion) continue;
    const zones = expansion.zones?.length ?? 0;
    line(`#${expansion.id} ${expansion.name}`, `${zones} zones`);
  }

  const after = await client.getRateLimit();
  console.log(`\nPoints spent by this check: ${after.pointsSpentThisHour - budget.pointsSpentThisHour}\n`);
}

main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
