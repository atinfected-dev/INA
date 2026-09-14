'use server';

import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { TIER_ORDER, type AchievementTier } from '@ina/core';
import { requireAdmin } from '../../../lib/auth';
import { loadSettings, saveSettings } from '../../../lib/settings';
import { HALL_OF_FAME_METRICS } from '../../../lib/hall-of-fame';
import {
  ContentError,
  createCustomAchievement,
  createCustomRecord,
  deleteCustomAchievement,
  deleteCustomRecord,
  titleId,
} from '../../../lib/custom-content';

/**
 * Officer actions for content.
 *
 * Every action checks the caller itself — the page being hidden from members
 * is a courtesy, not a guard. Outcomes travel back as a query parameter so the
 * forms stay plain server-rendered forms with no client state to keep.
 */

const PAGE = '/admin/inhalte';

function back(outcome: { ok?: string; error?: string }): never {
  const params = new URLSearchParams();
  if (outcome.ok) params.set('ok', outcome.ok);
  if (outcome.error) params.set('fehler', outcome.error);
  // Typed routes only know the literal; the query string is ours.
  redirect(`${PAGE}?${params.toString()}` as Route);
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '');
}

/** Everything that shows content officers can change. */
function revalidateContent(): void {
  revalidatePath(PAGE);
  revalidatePath('/hall-of-fame');
  revalidatePath('/records');
  revalidatePath('/erfolge');
  revalidatePath('/');
  revalidatePath('/mitglieder', 'layout');
  revalidatePath('/players', 'layout');
}

async function guarded(work: () => Promise<string>): Promise<never> {
  try {
    await requireAdmin();
  } catch {
    back({ error: 'Nicht berechtigt.' });
  }
  let ok: string;
  try {
    ok = await work();
  } catch (error) {
    if (error instanceof ContentError) back({ error: error.message });
    console.error(error);
    back({ error: 'Das hat nicht geklappt.' });
  }
  revalidateContent();
  back({ ok });
}

// --- Hall of Fame ----------------------------------------------------------

export async function addTitleAction(formData: FormData): Promise<void> {
  await guarded(async () => {
    const title = text(formData, 'title').trim();
    const subtitle = text(formData, 'subtitle').trim();
    const metric = text(formData, 'metric');
    const direction = text(formData, 'direction') === 'lowest' ? 'lowest' : 'highest';

    if (title.length < 2) throw new ContentError('Der Titel ist zu kurz.');
    if (!HALL_OF_FAME_METRICS.some((entry) => entry.key === metric)) {
      throw new ContentError('Unbekannte Kennzahl.');
    }

    const settings = await loadSettings();
    const id = titleId(
      title,
      settings.hallOfFameTitles.map((entry) => entry.id),
    );
    await saveSettings({
      hallOfFameTitles: [...settings.hallOfFameTitles, { id, title, subtitle, metric, direction }],
    });
    return `Titel „${title}“ angelegt.`;
  });
}

export async function removeTitleAction(formData: FormData): Promise<void> {
  await guarded(async () => {
    const id = text(formData, 'id');
    const settings = await loadSettings();
    const remaining = settings.hallOfFameTitles.filter((entry) => entry.id !== id);
    if (remaining.length === settings.hallOfFameTitles.length) {
      throw new ContentError('Diesen Titel gibt es nicht.');
    }
    await saveSettings({ hallOfFameTitles: remaining });
    return 'Titel entfernt.';
  });
}

// --- Achievements ----------------------------------------------------------

export async function addAchievementAction(formData: FormData): Promise<void> {
  await guarded(async () => {
    const thresholds: Partial<Record<AchievementTier, string>> = {};
    for (const tier of TIER_ORDER) thresholds[tier] = text(formData, `threshold-${tier}`);

    await createCustomAchievement({
      name: text(formData, 'name'),
      description: text(formData, 'description'),
      category: text(formData, 'category'),
      metric: text(formData, 'metric'),
      thresholds,
    });
    return `Erfolg „${text(formData, 'name').trim()}“ angelegt.`;
  });
}

export async function removeAchievementAction(formData: FormData): Promise<void> {
  await guarded(async () => {
    await deleteCustomAchievement(text(formData, 'id'));
    return 'Erfolg entfernt.';
  });
}

// --- Records ---------------------------------------------------------------

export async function addRecordAction(formData: FormData): Promise<void> {
  await guarded(async () => {
    await createCustomRecord({
      label: text(formData, 'label'),
      formula: text(formData, 'formula'),
      metric: text(formData, 'metric'),
      value: text(formData, 'value'),
      holder: text(formData, 'holder'),
      holderClass: text(formData, 'holderClass'),
      context: text(formData, 'context'),
    });
    return `Rekord „${text(formData, 'label').trim()}“ angelegt.`;
  });
}

export async function removeRecordAction(formData: FormData): Promise<void> {
  await guarded(async () => {
    await deleteCustomRecord(text(formData, 'id'));
    return 'Rekord entfernt.';
  });
}
