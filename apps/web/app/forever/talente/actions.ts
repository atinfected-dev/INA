'use server';

import type { Route } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getViewer } from '../../../lib/auth';
import { BuildError, createBuild, vote, voterHash } from '../../../lib/forever-builds';

const text = (formData: FormData, name: string): string => String(formData.get(name) ?? '');

export async function saveBuildAction(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  const className = text(formData, 'className');
  let id: string;
  try {
    id = await createBuild({
      className,
      title: text(formData, 'title'),
      code: text(formData, 'code'),
      authorId: viewer?.id ?? null,
    });
  } catch (error) {
    const message = error instanceof BuildError ? error.message : 'Das hat nicht geklappt.';
    redirect(`/forever/talente/${className}?t=${encodeURIComponent(text(formData, 'code'))}&fehler=${encodeURIComponent(message)}` as Route);
  }
  revalidatePath('/forever/talente');
  redirect(`/forever/talente/${className}?b=${id}&ok=1` as Route);
}

export async function voteBuildAction(formData: FormData): Promise<void> {
  const id = text(formData, 'id');
  const back = text(formData, 'back') || '/forever/talente/builds';
  const h = await headers();
  const address = (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? '').split(',')[0]!.trim();
  const hash = voterHash(address, h.get('user-agent') ?? '');
  const result = await vote(id, hash);
  revalidatePath('/forever/talente');
  const joiner = back.includes('?') ? '&' : '?';
  redirect(`${back}${joiner}stimme=${result}` as Route);
}
