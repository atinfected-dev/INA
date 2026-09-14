import { prisma } from '@ina/db';
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
