import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

export * from './generated/prisma/client';

/**
 * Shared Prisma client.
 *
 * Two things this has to get right:
 *
 *  1. Lazy construction. ESM evaluates every import before the importing
 *     module's own statements run, so a script that loads .env at the top of
 *     its body would still hit an unset DATABASE_URL if the client were built
 *     at import time. The exported `prisma` is a proxy that constructs the real
 *     client on first property access instead.
 *
 *  2. A single pool. Next.js re-evaluates server modules on every hot reload,
 *     which would otherwise open a new pool per edit until Postgres starts
 *     refusing connections. The instance is therefore cached on globalThis in
 *     development.
 */
declare global {
  // eslint-disable-next-line no-var
  var __inaPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env and fill it in.');
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') globalThis.__inaPrisma = client;
  return client;
}

export function getPrisma(): PrismaClient {
  return globalThis.__inaPrisma ?? createClient();
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(getPrisma(), property, receiver);
  },
  has(_target, property) {
    return Reflect.has(getPrisma(), property);
  },
});
