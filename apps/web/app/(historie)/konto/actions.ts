'use server';

import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@ina/db';
import { ACHIEVEMENTS } from '@ina/core';
import { MAX_PINNED } from '../../../lib/achievements';
import { invalidateAll } from '../../../lib/cache';
import { revalidatePath } from 'next/cache';
import { AuthError, createSession, destroySession, getViewer, login, register, requireAdmin } from '../../../lib/auth';
import { ClaimError, approveClaim, rejectClaim, requestClaim, revokeClaim } from '../../../lib/claims';

/**
 * Server actions for registration, login and claims.
 *
 * Errors come back as a message the form renders, never as an exception page —
 * a failed login is an ordinary outcome, not a crash.
 */

export interface FormState {
  error?: string;
  notice?: string;
}

function message(error: unknown, fallback: string): string {
  if (error instanceof AuthError || error instanceof ClaimError) return error.message;
  console.error(error);
  return fallback;
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const accountId = await register({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      displayName: String(formData.get('displayName') ?? ''),
      realName: String(formData.get('realName') ?? ''),
    });
    await createSession(accountId);
  } catch (error) {
    return { error: message(error, 'Registrierung fehlgeschlagen.') };
  }
  redirect('/konto');
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  try {
    const accountId = await login(
      String(formData.get('email') ?? ''),
      String(formData.get('password') ?? ''),
    );
    await createSession(accountId);
  } catch (error) {
    return { error: message(error, 'Anmeldung fehlgeschlagen.') };
  }
  // Members land on the Forever page: the plan for what comes next, not the
  // account settings.
  redirect('/forever' as Route);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/');
}

export async function claimAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: 'Bitte zuerst anmelden.' };

  try {
    await requestClaim(
      viewer.id,
      String(formData.get('characterId') ?? ''),
      String(formData.get('note') ?? ''),
    );
  } catch (error) {
    return { error: message(error, 'Antrag fehlgeschlagen.') };
  }

  revalidatePath('/konto');
  return { notice: 'Antrag gestellt. Ein Offizier prüft ihn.' };
}

export async function decideClaimAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let viewer;
  try {
    viewer = await requireAdmin();
  } catch {
    return { error: 'Nicht berechtigt.' };
  }

  const claimId = String(formData.get('claimId') ?? '');
  const decision = String(formData.get('decision') ?? '');

  try {
    if (decision === 'approve') await approveClaim(claimId, viewer.id);
    else if (decision === 'reject') {
      await rejectClaim(claimId, viewer.id, String(formData.get('reason') ?? ''));
    } else if (decision === 'revoke') await revokeClaim(claimId, viewer.id);
    else return { error: 'Unbekannte Entscheidung.' };
  } catch (error) {
    return { error: message(error, 'Entscheidung fehlgeschlagen.') };
  }

  // A claim moves a character into or out of a person; every per-person
  // aggregate changes with it.
  invalidateAll();
  revalidatePath('/admin/claims');
  revalidatePath('/konto');
  return { notice: 'Gespeichert.' };
}

/**
 * Pins up to six achievements to the member's own profile.
 *
 * Only the signed-in account's own pins, and only achievements that exist —
 * the id list comes from a form, so it is treated as input, not as truth.
 */
export async function savePinsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: 'Bitte zuerst anmelden.' };

  const known = new Set(ACHIEVEMENTS.map((entry) => entry.id));
  const chosen = formData
    .getAll('pinned')
    .map(String)
    .filter((id) => known.has(id))
    .slice(0, MAX_PINNED);

  await prisma.account.update({
    where: { id: viewer.id },
    data: { pinnedAchievements: chosen },
  });

  revalidatePath('/konto');
  revalidatePath('/players', 'layout');
  return {
    notice:
      chosen.length === 0
        ? 'Angepinnte Erfolge entfernt.'
        : `${chosen.length} Erfolg${chosen.length === 1 ? '' : 'e'} angepinnt.`,
  };
}
