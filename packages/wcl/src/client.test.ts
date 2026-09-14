import { afterEach, describe, expect, it, vi } from 'vitest';
import { WclClient } from './client';
import { WclGraphQLError, WclHttpError } from './errors';
import { Semaphore } from './semaphore';
import { isStale, msUntilReset, remainingPoints } from './rate-limit';
import type { WclConfig } from './config';

const config: WclConfig = {
  tokenUrl: 'https://example.invalid/oauth/token',
  apiHost: 'https://example.invalid',
  clientEndpoint: 'https://example.invalid/api/v2/client',
  clientId: 'id',
  clientSecret: 'secret',
  pointReserve: 100,
  maxConcurrency: 2,
};

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/** Answers the token request, then hands each API call to `handler`. */
function stubFetch(handler: (call: number) => Response): void {
  let apiCalls = 0;
  vi.stubGlobal('fetch', (input: string | URL) => {
    if (String(input).includes('/oauth/token')) {
      return Promise.resolve(jsonResponse({ access_token: 't', token_type: 'Bearer', expires_in: 3600 }));
    }
    apiCalls += 1;
    return Promise.resolve(handler(apiCalls));
  });
}

const budget = { limitPerHour: 18000, pointsSpentThisHour: 10, pointsResetIn: 1800 };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WclClient rate limiting', () => {
  /**
   * The regression test for the import that appeared to hang at report 63.
   * Warcraft Logs answers an exhausted budget with a Retry-After of up to an
   * hour; obeying it literally made the process sit silently for that long.
   */
  it('caps a huge Retry-After instead of sleeping it out', async () => {
    const slept: number[] = [];
    stubFetch((call) =>
      call === 1
        ? jsonResponse({ error: 'Too many requests' }, 429, { 'retry-after': '3600' })
        : jsonResponse({ data: { rateLimitData: budget } }),
    );

    const client = new WclClient({
      config,
      sleep: async (ms) => {
        slept.push(ms);
      },
    });

    await client.getRateLimit();

    expect(slept.length).toBeGreaterThan(0);
    expect(Math.max(...slept)).toBeLessThanOrEqual(WclClient.MAX_BACKOFF_MS);
    // 3600 s would be 3_600_000 ms; anything near that is the bug returning.
    expect(Math.max(...slept)).toBeLessThan(60_000);
  });

  it('reports an exhausted budget rather than waiting when told to fail fast', async () => {
    stubFetch(() => jsonResponse({ error: 'Too many requests' }, 429));

    const client = new WclClient({
      config,
      maxAttempts: 1,
      waitForRateLimitReset: false,
      sleep: async () => undefined,
    });

    await expect(client.query('query { rateLimitData { limitPerHour } }')).rejects.toThrow(
      /budget exhausted|HTTP 429/i,
    );
  });

  it('pauses when the remaining points fall below the reserve', async () => {
    const spent = { ...budget, pointsSpentThisHour: budget.limitPerHour - 50 };
    let served = 0;
    stubFetch(() => {
      served += 1;
      // The first budget read is exhausted; after the pause it is replenished.
      return jsonResponse({
        data: { rateLimitData: served <= 1 ? spent : budget, worldData: { expansions: [] } },
      });
    });

    const paused: number[] = [];
    const client = new WclClient({
      config,
      sleep: async (ms) => {
        paused.push(ms);
      },
      onRateLimit: () => undefined,
    });

    await client.query('query { worldData { expansions { id } } }');
    expect(paused.length).toBeGreaterThan(0);
  });
});

describe('WclClient error handling', () => {
  it('raises GraphQL errors instead of returning partial data', async () => {
    stubFetch(() =>
      jsonResponse({
        data: { rateLimitData: budget },
        errors: [{ message: 'Cannot query field "nope"', path: ['reportData'] }],
      }),
    );

    const client = new WclClient({ config, maxAttempts: 1, sleep: async () => undefined });
    await expect(client.getRateLimit()).rejects.toBeInstanceOf(WclGraphQLError);
  });

  it('does not retry a request that is simply wrong', async () => {
    let calls = 0;
    stubFetch(() => {
      calls += 1;
      return jsonResponse({ error: 'bad request' }, 400);
    });

    const client = new WclClient({ config, sleep: async () => undefined });
    await expect(client.getRateLimit()).rejects.toBeInstanceOf(WclHttpError);
    expect(calls).toBe(1);
  });
});

describe('Semaphore', () => {
  it('never runs more than the permitted number at once', async () => {
    const semaphore = new Semaphore(2);
    let active = 0;
    let peak = 0;

    await Promise.all(
      Array.from({ length: 8 }, () =>
        semaphore.run(async () => {
          active += 1;
          peak = Math.max(peak, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active -= 1;
        }),
      ),
    );

    expect(peak).toBe(2);
  });

  it('releases its slot when the task throws', async () => {
    const semaphore = new Semaphore(1);
    await expect(semaphore.run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(semaphore.run(async () => 'weiter')).resolves.toBe('weiter');
  });

  it('rejects a nonsensical permit count', () => {
    expect(() => new Semaphore(0)).toThrow(/at least 1/);
  });
});

describe('rate limit helpers', () => {
  it('never reports negative headroom', () => {
    expect(
      remainingPoints({
        limitPerHour: 100,
        pointsSpentThisHour: 140,
        pointsResetIn: 10,
        observedAt: Date.now(),
      }),
    ).toBe(0);
  });

  it('treats an old snapshot as stale', () => {
    const snapshot = {
      limitPerHour: 100,
      pointsSpentThisHour: 1,
      pointsResetIn: 10,
      observedAt: Date.now() - 30_000,
    };
    expect(isStale(snapshot, 15_000)).toBe(true);
    expect(isStale(snapshot, 60_000)).toBe(false);
  });

  it('counts down the reset as the snapshot ages', () => {
    const now = Date.now();
    const fresh = msUntilReset({
      limitPerHour: 100,
      pointsSpentThisHour: 1,
      pointsResetIn: 600,
      observedAt: now,
    });
    const aged = msUntilReset({
      limitPerHour: 100,
      pointsSpentThisHour: 1,
      pointsResetIn: 600,
      observedAt: now - 300_000,
    });
    expect(aged).toBeLessThan(fresh);
  });
});
