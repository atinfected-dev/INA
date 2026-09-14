/**
 * Idempotent seed.
 *
 * Creates the default settings row, and — when the corresponding environment
 * variables are filled in — the guild and the admin account. Running it twice
 * changes nothing, so it is safe to re-run after editing .env.
 */
import { resolve } from 'node:path';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '@ina/core';
import { hashPassword } from '@ina/core/password';
import { Prisma, prisma } from '../src/index.js';

process.loadEnvFile(resolve(import.meta.dirname, '../../../.env'));

async function main(): Promise<void> {
  // Settings: created once, never overwritten — otherwise every deploy would
  // reset the thresholds an admin deliberately changed.
  const existing = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
  if (existing) {
    console.log('settings   · already present, left untouched');
  } else {
    await prisma.setting.create({
      // AppSettings is a closed interface; Prisma's Json input wants an index
      // signature. Cast here rather than weakening the type for every consumer.
      data: { key: SETTINGS_KEY, value: DEFAULT_SETTINGS as unknown as Prisma.InputJsonObject },
    });
    console.log('settings   · created with defaults');
  }

  const name = process.env.GUILD_NAME?.trim();
  const serverSlug = process.env.GUILD_SERVER_SLUG?.trim();
  const serverRegion = process.env.GUILD_SERVER_REGION?.trim();
  const apiHost = process.env.WCL_API_HOST?.trim() || 'https://classic.warcraftlogs.com';

  if (!name || !serverSlug || !serverRegion) {
    console.log('guild      · skipped (set GUILD_NAME, GUILD_SERVER_SLUG, GUILD_SERVER_REGION)');
  } else {
    const guild = await prisma.guild.upsert({
      where: { name_serverSlug_serverRegion: { name, serverSlug, serverRegion } },
      update: { apiHost },
      create: { name, serverSlug, serverRegion, apiHost, isDefault: true },
    });
    console.log(`guild      · ${guild.name} — ${guild.serverSlug} (${guild.serverRegion})`);
  }

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('admin      · skipped (set ADMIN_EMAIL and ADMIN_PASSWORD)');
  } else {
    const passwordHash = await hashPassword(password);
    await prisma.adminUser.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, passwordHash },
    });
    console.log(`admin      · ${email}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
