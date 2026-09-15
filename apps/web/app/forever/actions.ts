'use server';

import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getViewer } from '../../lib/auth';
import { ForeverError, deleteForeverCharacter, saveForeverCharacter } from '../../lib/forever';

/**
 * A member's own Forever character. Outcomes come back as a query parameter,
 * the same way the officer forms work: plain forms, no client state.
 */

const PAGE = '/forever';

function back(outcome: { ok?: string; error?: string }): never {
  const params = new URLSearchParams();
  if (outcome.ok) params.set('ok', outcome.ok);
  if (outcome.error) params.set('fehler', outcome.error);
  redirect(`${PAGE}?${params.toString()}#mein-charakter` as Route);
}

const text = (formData: FormData, name: string): string => String(formData.get(name) ?? '');

export async function saveForeverCharacterAction(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) redirect('/anmelden');

  try {
    await saveForeverCharacter(viewer.id, {
      name: text(formData, 'name'),
      race: text(formData, 'race'),
      className: text(formData, 'className'),
      faction: text(formData, 'faction'),
      role: text(formData, 'role'),
      note: text(formData, 'note'),
    });
  } catch (error) {
    if (error instanceof ForeverError) back({ error: error.message });
    console.error(error);
    back({ error: 'Das hat nicht geklappt.' });
  }
  revalidatePath(PAGE);
  back({ ok: `${text(formData, 'name').trim()} steht auf der Liste.` });
}

export async function deleteForeverCharacterAction(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) redirect('/anmelden');
  await deleteForeverCharacter(viewer.id);
  revalidatePath(PAGE);
  back({ ok: 'Charakter entfernt.' });
}
