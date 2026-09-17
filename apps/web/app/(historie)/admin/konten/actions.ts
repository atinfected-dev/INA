'use server';

import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { AccountError, setActive, setOfficer } from '../../../../lib/accounts';
import { requireAdmin } from '../../../../lib/auth';

const PAGE = '/admin/konten';
const text = (formData: FormData, name: string): string => String(formData.get(name) ?? '');

function back(outcome: { ok?: string; error?: string }): never {
  const params = new URLSearchParams();
  if (outcome.ok) params.set('ok', outcome.ok);
  if (outcome.error) params.set('fehler', outcome.error);
  const query = params.toString();
  redirect(`${PAGE}${query ? `?${query}` : ''}` as Route);
}

async function guarded(work: (actorId: string) => Promise<string>): Promise<never> {
  let actorId: string;
  try {
    actorId = (await requireAdmin()).id;
  } catch {
    back({ error: 'Nicht berechtigt.' });
  }
  let ok: string;
  try {
    ok = await work(actorId);
  } catch (error) {
    if (error instanceof AccountError) back({ error: error.message });
    console.error(error);
    back({ error: 'Das hat nicht geklappt.' });
  }
  revalidatePath(PAGE);
  back({ ok });
}

export async function setOfficerAction(formData: FormData): Promise<void> {
  await guarded(async (actorId) => {
    const officer = text(formData, 'officer') === '1';
    await setOfficer(actorId, text(formData, 'id'), officer);
    return officer ? `${text(formData, 'name')} ist jetzt Offizier.` : `${text(formData, 'name')} ist kein Offizier mehr.`;
  });
}

export async function setActiveAction(formData: FormData): Promise<void> {
  await guarded(async (actorId) => {
    const active = text(formData, 'active') === '1';
    await setActive(actorId, text(formData, 'id'), active);
    return active ? `${text(formData, 'name')} kann sich wieder anmelden.` : `${text(formData, 'name')} ist deaktiviert und abgemeldet.`;
  });
}
