import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from '@ina/db';
import { hashPassword, verifyPassword } from '@ina/core';

/**
 * Session handling.
 *
 * Opaque random tokens in an httpOnly cookie, with only their SHA-256 hash in
 * the database. A stolen database dump therefore yields no usable sessions —
 * the same reasoning that keeps passwords hashed. No JWTs: a guild site wants
 * to be able to revoke a session immediately, which a self-contained token
 * cannot offer.
 *
 * `server-only` at the top makes importing this from a client component a build
 * error rather than a leak.
 */

const COOKIE = 'ina_session';
const SESSION_DAYS = 30;

export interface Viewer {
  id: string;
  email: string;
  displayName: string;
  realName: string | null;
  isAdmin: boolean;
  personId: string | null;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(accountId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await prisma.session.create({
    data: { tokenHash: hashToken(token), accountId, expiresAt },
  });

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(COOKIE);
}

/**
 * The signed-in account, or null.
 *
 * Every page that shows a real name must gate on this. Expired sessions are
 * treated as absent and cleaned up opportunistically.
 */
export async function getViewer(): Promise<Viewer | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      account: {
        select: {
          id: true,
          email: true,
          displayName: true,
          realName: true,
          isAdmin: true,
          isActive: true,
          personId: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
    return null;
  }

  // A deactivated account keeps its session row but must not be a viewer.
  if (!session.account.isActive) return null;

  const { isActive: _isActive, ...viewer } = session.account;
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) throw new Error('Nicht berechtigt.');
  return viewer;
}

// --- Registration and login ------------------------------------------------

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  realName?: string;
}

export class AuthError extends Error {}

export async function register(input: RegisterInput): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AuthError('Keine gültige E-Mail-Adresse.');
  if (displayName.length < 2) throw new AuthError('Anzeigename ist zu kurz.');
  if (input.password.length < 12) {
    throw new AuthError('Das Passwort muss mindestens 12 Zeichen haben.');
  }

  const existing = await prisma.account.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new AuthError('Für diese E-Mail-Adresse gibt es bereits ein Konto.');

  // The very first account becomes admin — otherwise nobody could ever approve
  // a claim, including their own.
  const isFirst = (await prisma.account.count()) === 0;

  const account = await prisma.account.create({
    data: {
      email,
      displayName,
      realName: input.realName?.trim() || null,
      passwordHash: await hashPassword(input.password),
      isAdmin: isFirst,
    },
    select: { id: true },
  });

  return account.id;
}

export async function login(email: string, password: string): Promise<string> {
  const account = await prisma.account.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, passwordHash: true, isActive: true },
  });

  // Same message either way: distinguishing them tells an attacker which
  // addresses are registered.
  const invalid = new AuthError('E-Mail-Adresse oder Passwort ist falsch.');

  if (!account) {
    // Still spend the time a real verification would, so a missing account is
    // not detectable by how fast the answer comes back.
    await verifyPassword(password, 'scrypt$00$00');
    throw invalid;
  }

  if (!(await verifyPassword(password, account.passwordHash))) throw invalid;
  if (!account.isActive) throw new AuthError('Dieses Konto ist deaktiviert.');

  await prisma.account.update({
    where: { id: account.id },
    data: { lastLoginAt: new Date() },
  });

  return account.id;
}

/** Guards against a timing side channel in token comparison helpers. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
