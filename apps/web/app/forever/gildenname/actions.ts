'use server';

import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getViewer } from '../../../lib/auth';
import { PollError, addOption, castVote, removeOption } from '../../../lib/guild-name-poll';

const PAGE = '/forever/gildenname';
const text = (formData: FormData, name: string): string => String(formData.get(name) ?? '');

function back(outcome: { ok?: string; error?: string }): never {
  const params = new URLSearchParams();
  if (outcome.ok) params.set('ok', outcome.ok);
  if (outcome.error) params.set('fehler', outcome.error);
  const query = params.toString();
  redirect(`${PAGE}${query ? `?${query}` : ''}#namen` as Route);
}

export async function voteNameAction(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) redirect('/anmelden');
  let result: 'up' | 'down' | 'withdrawn';
  try {
    result = await castVote(viewer.id, text(formData, 'id'), Number(text(formData, 'value')));
  } catch (error) {
    back({ error: error instanceof PollError ? error.message : 'Das hat nicht geklappt.' });
  }
  revalidatePath(PAGE);
  back({
    ok:
      result === 'withdrawn'
        ? 'Stimme zurückgezogen.'
        : result === 'up'
          ? 'Hochgestimmt.'
          : 'Runtergestimmt.',
  });
}

export async function addNameAction(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) redirect('/anmelden');
  try {
    await addOption(text(formData, 'name'));
  } catch (error) {
    back({ error: error instanceof PollError ? error.message : 'Das hat nicht geklappt.' });
  }
  revalidatePath(PAGE);
  back({ ok: `„${text(formData, 'name').trim()}“ steht zur Wahl.` });
}

export async function removeNameAction(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) redirect('/anmelden');
  await removeOption(text(formData, 'id'));
  revalidatePath(PAGE);
  back({ ok: 'Name entfernt — mit allen Stimmen dazu.' });
}
