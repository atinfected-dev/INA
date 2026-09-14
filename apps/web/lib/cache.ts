/**
 * In-process result cache with a time to live.
 *
 * The pages are dynamic — the masthead reads the session cookie — so Next's
 * page-level revalidation never applies and every request would recompute
 * everything. The expensive part is a handful of aggregate loaders whose
 * answers change only when the import pipeline has run, which is a few times
 * a day. Holding those answers in memory for a quarter of an hour turns a
 * ten-second page into a ten-millisecond one and costs nothing in freshness
 * a raider would notice.
 *
 * Concurrent callers share one computation: the first request starts it,
 * the others await the same promise instead of piling onto the database.
 *
 * Officer actions that change what the pages show call `invalidateAll()`, so
 * a new title or record appears at once rather than a quarter hour later.
 */

interface Entry {
  value: Promise<unknown>;
  expiresAt: number;
}

const store = new Map<string, Entry>();

export const DEFAULT_TTL_MS = 15 * 60_000;

export async function memo<T>(
  key: string,
  work: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expiresAt > now) return hit.value as Promise<T>;

  const value = work().catch((error: unknown) => {
    // A failure must not be served for fifteen minutes.
    store.delete(key);
    throw error;
  });
  store.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

export function invalidateAll(): void {
  store.clear();
}

/** A stable key from a filter object, so `{a:1,b:2}` and `{b:2,a:1}` share. */
export function keyOf(prefix: string, params: object = {}): string {
  const entries = Object.entries(params as Record<string, unknown>)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return `${prefix}:${JSON.stringify(entries)}`;
}
