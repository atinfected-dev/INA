import { prisma } from '@ina/db';
import { hashPassword, verifyPassword } from '@ina/core/password';

/**
 * Account management.
 *
 * Two sides of one table: a member edits their own data — display name, real
 * name, e-mail, password — and an officer grants or withdraws the officer
 * role and can switch a login off. The guards are the ones that keep the
 * site administrable: nobody demotes or deactivates themselves, and the last
 * officer cannot be removed, because then no one could approve anything.
 */

export class AccountError extends Error {}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface ProfileInput {
  displayName: string;
  realName: string;
  email: string;
}

export async function updateProfile(accountId: string, input: ProfileInput): Promise<{ emailChanged: boolean }> {
  const displayName = input.displayName.trim().replace(/\s+/g, ' ');
  const realName = input.realName.trim().replace(/\s+/g, ' ');
  const email = input.email.trim().toLowerCase();

  if (displayName.length < 2 || displayName.length > 40) throw new AccountError('Der Anzeigename braucht 2 bis 40 Zeichen.');
  if (realName.length > 80) throw new AccountError('Der Klarname ist zu lang.');
  if (!EMAIL.test(email)) throw new AccountError('Keine gültige E-Mail-Adresse.');

  const current = await prisma.account.findUnique({ where: { id: accountId }, select: { email: true } });
  if (!current) throw new AccountError('Konto nicht gefunden.');

  if (email !== current.email) {
    const taken = await prisma.account.findUnique({ where: { email }, select: { id: true } });
    if (taken) throw new AccountError('Diese E-Mail-Adresse gehört schon zu einem anderen Konto.');
  }

  await prisma.account.update({
    where: { id: accountId },
    data: { displayName, realName: realName === '' ? null : realName, email },
  });
  return { emailChanged: email !== current.email };
}

export async function changePassword(accountId: string, currentPassword: string, nextPassword: string, repeat: string): Promise<void> {
  if (nextPassword.length < 12) throw new AccountError('Das neue Passwort muss mindestens 12 Zeichen haben.');
  if (nextPassword !== repeat) throw new AccountError('Die Wiederholung stimmt nicht mit dem neuen Passwort überein.');

  const account = await prisma.account.findUnique({ where: { id: accountId }, select: { passwordHash: true } });
  if (!account) throw new AccountError('Konto nicht gefunden.');
  if (!(await verifyPassword(currentPassword, account.passwordHash))) {
    throw new AccountError('Das aktuelle Passwort ist falsch.');
  }
  if (currentPassword === nextPassword) throw new AccountError('Das neue Passwort ist das alte.');

  await prisma.account.update({ where: { id: accountId }, data: { passwordHash: await hashPassword(nextPassword) } });
}

// --- Officers ------------------------------------------------------------------------

export interface AccountRow {
  id: string;
  email: string;
  displayName: string;
  realName: string | null;
  isAdmin: boolean;
  isActive: boolean;
  personName: string | null;
  characters: number;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export async function listAccounts(): Promise<AccountRow[]> {
  const rows = await prisma.account.findMany({
    orderBy: [{ isAdmin: 'desc' }, { displayName: 'asc' }],
    select: {
      id: true,
      email: true,
      displayName: true,
      realName: true,
      isAdmin: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      person: { select: { displayName: true, _count: { select: { characters: true } } } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    realName: row.realName,
    isAdmin: row.isAdmin,
    isActive: row.isActive,
    personName: row.person?.displayName ?? null,
    characters: row.person?._count.characters ?? 0,
    createdAt: row.createdAt,
    lastLoginAt: row.lastLoginAt,
  }));
}

async function adminCount(): Promise<number> {
  return prisma.account.count({ where: { isAdmin: true, isActive: true } });
}

/** Grants or withdraws the officer role. */
export async function setOfficer(actorId: string, targetId: string, officer: boolean): Promise<void> {
  if (actorId === targetId) throw new AccountError('Die eigene Rolle lässt sich nicht ändern — das macht ein anderer Offizier.');
  const target = await prisma.account.findUnique({ where: { id: targetId }, select: { isAdmin: true, isActive: true } });
  if (!target) throw new AccountError('Konto nicht gefunden.');
  if (target.isAdmin === officer) return;
  if (!officer && target.isActive && (await adminCount()) <= 1) {
    throw new AccountError('Der letzte Offizier bleibt Offizier.');
  }
  await prisma.account.update({ where: { id: targetId }, data: { isAdmin: officer } });
}

/** Switches a login on or off. Sessions of a deactivated account end at once. */
export async function setActive(actorId: string, targetId: string, active: boolean): Promise<void> {
  if (actorId === targetId) throw new AccountError('Das eigene Konto lässt sich nicht deaktivieren.');
  const target = await prisma.account.findUnique({ where: { id: targetId }, select: { isAdmin: true, isActive: true } });
  if (!target) throw new AccountError('Konto nicht gefunden.');
  if (target.isActive === active) return;
  if (!active && target.isAdmin && (await adminCount()) <= 1) {
    throw new AccountError('Der letzte aktive Offizier lässt sich nicht deaktivieren.');
  }
  await prisma.account.update({ where: { id: targetId }, data: { isActive: active } });
  if (!active) await prisma.session.deleteMany({ where: { accountId: targetId } });
}
