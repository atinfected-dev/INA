import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

/**
 * Password hashing for the single admin account.
 *
 * scrypt ships with Node, so there is no native build step in the Docker image
 * and no extra dependency to keep patched — which matters more here than the
 * marginal advantage argon2id would give for one login.
 *
 * Stored format: scrypt$<saltHex>$<hashHex>
 */
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const PREFIX = 'scrypt';

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12) {
    throw new Error('Admin passwords must be at least 12 characters.');
  }
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `${PREFIX}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [prefix, saltHex, hashHex] = stored.split('$');
  if (prefix !== PREFIX || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, 'hex');
  const derived = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);

  // Constant-time compare; lengths are equal by construction above.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
