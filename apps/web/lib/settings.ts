import { prisma, type Prisma } from '@ina/db';
import { DEFAULT_SETTINGS, SETTINGS_KEY, type AppSettings } from '@ina/core';

/**
 * Effective settings: the stored row on top of the defaults.
 *
 * Merged rather than replaced, so a setting added in code after the row was
 * written still has a value instead of turning into undefined at runtime.
 */
export async function loadSettings(): Promise<AppSettings> {
  const row = await prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row || typeof row.value !== 'object' || row.value === null || Array.isArray(row.value)) {
    return DEFAULT_SETTINGS;
  }
  return { ...DEFAULT_SETTINGS, ...(row.value as Partial<AppSettings>) };
}

/** Stores a partial update on top of what is there; the defaults fill the rest. */
export async function saveSettings(update: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings();
  const next = { ...current, ...update };
  // Plain data all the way down, but TypeScript cannot see that through the
  // typed arrays; the cast says so once, here.
  const value = next as unknown as Prisma.InputJsonValue;
  await prisma.setting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value },
    update: { value },
  });
  return next;
}
