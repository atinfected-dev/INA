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
    // Pool size is a deployment decision, not a code one: on a host whose
    // Postgres is shared with other applications, every process has to stay
    // well under its share of max_connections. Unset, pg's default of ten.
    adapter: new PrismaPg({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  return client;
}

/**
 * Exactly one client per process.
 *
 * The module-level variable is the singleton in production. The globalThis
 * copy exists for development only, where Next re-evaluates this module on
 * every hot reload and a plain module variable would start over each time.
 *
 * The first version cached on globalThis alone — and only outside production.
 * In production every property access therefore built a NEW client with its
 * own pool: connections leaked until Postgres refused them, and an interactive
 * transaction began on one client while its queries ran on another, which
 * Prisma reports as "transaction not found". Development never showed it.
 */
let instance: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (process.env.NODE_ENV !== 'production') {
    globalThis.__inaPrisma ??= createClient();
    return globalThis.__inaPrisma;
  }
  instance ??= createClient();
  return instance;
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value = Reflect.get(client, property, client);
    // Methods must run with the real client as `this`, not with this proxy:
    // Prisma's own internals reach for `this._engine` and friends.
    return typeof value === 'function' ? value.bind(client) : value;
  },
  has(_target, property) {
    return Reflect.has(getPrisma(), property);
  },
});
