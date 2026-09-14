import { print, type DocumentNode } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { loadWclConfig, type WclConfig } from './config.js';
import { TokenProvider } from './auth.js';
import { WclGraphQLError, WclHttpError, WclRateLimitError } from './errors.js';
import { Semaphore } from './semaphore.js';
import { isStale, msUntilReset, remainingPoints, type RateLimitSnapshot } from './rate-limit.js';

export interface WclClientOptions {
  config?: WclConfig;
  /** Attempts per request, including the first one. */
  maxAttempts?: number;
  /**
   * When the hourly point budget is exhausted: wait for the reset (default) or
   * fail fast. Long-running import jobs want to wait; an interactive request
   * wants an error.
   */
  waitForRateLimitReset?: boolean;
  /** Injected in tests so backoff does not actually sleep. */
  sleep?: (ms: number) => Promise<void>;
  onRateLimit?: (snapshot: RateLimitSnapshot) => void;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string; path?: (string | number)[] }[];
}

const RATE_LIMIT_QUERY = `query RateLimit {
  rateLimitData { limitPerHour pointsSpentThisHour pointsResetIn }
}`;

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Server-side client for the Warcraft Logs API v2.
 *
 * Responsibilities, in order of importance:
 *  1. Never leak credentials - this module is server-only by construction.
 *  2. Never exceed the hourly point budget; pause instead of failing an import.
 *  3. Retry transient failures (429, 5xx, network) with exponential backoff.
 *  4. Cap concurrency so a parallel job fan-out cannot swamp the API.
 */
export class WclClient {
  readonly #config: WclConfig;
  readonly #tokens: TokenProvider;
  readonly #semaphore: Semaphore;
  readonly #maxAttempts: number;
  readonly #waitForReset: boolean;
  readonly #sleep: (ms: number) => Promise<void>;
  readonly #onRateLimit: ((snapshot: RateLimitSnapshot) => void) | undefined;

  #budget: RateLimitSnapshot | undefined;
  /** Shared gate so parallel callers pause together rather than each re-checking. */
  #budgetCheck: Promise<void> | undefined;

  constructor(options: WclClientOptions = {}) {
    this.#config = options.config ?? loadWclConfig();
    this.#tokens = new TokenProvider(this.#config);
    this.#semaphore = new Semaphore(this.#config.maxConcurrency);
    this.#maxAttempts = options.maxAttempts ?? 5;
    this.#waitForReset = options.waitForRateLimitReset ?? true;
    this.#sleep = options.sleep ?? defaultSleep;
    this.#onRateLimit = options.onRateLimit;
  }

  get apiHost(): string {
    return this.#config.apiHost;
  }

  /** Runs a typed operation produced by graphql-codegen. */
  async query<TResult, TVariables>(
    document: TypedDocumentNode<TResult, TVariables> | DocumentNode | string,
    variables?: TVariables,
  ): Promise<TResult> {
    const source = typeof document === 'string' ? document : print(document);
    return this.#execute<TResult>(source, variables as Record<string, unknown> | undefined, true);
  }

  /** Reads the current point budget. Cheap, and itself subject to the budget. */
  async getRateLimit(): Promise<RateLimitSnapshot> {
    const data = await this.#execute<{
      rateLimitData: { limitPerHour: number; pointsSpentThisHour: number; pointsResetIn: number };
    }>(RATE_LIMIT_QUERY, undefined, false);

    const snapshot: RateLimitSnapshot = {
      limitPerHour: data.rateLimitData.limitPerHour,
      pointsSpentThisHour: data.rateLimitData.pointsSpentThisHour,
      pointsResetIn: data.rateLimitData.pointsResetIn,
      observedAt: Date.now(),
    };
    this.#budget = snapshot;
    return snapshot;
  }

  /**
   * Blocks until there is enough headroom in the hourly budget. Parallel
   * callers share one check, so a fan-out pauses together instead of each
   * request spending a point to discover the same thing.
   */
  async #ensureBudget(): Promise<void> {
    this.#budgetCheck ??= this.#checkBudget().finally(() => {
      this.#budgetCheck = undefined;
    });
    await this.#budgetCheck;
  }

  async #checkBudget(): Promise<void> {
    for (;;) {
      let snapshot = this.#budget;
      if (!snapshot || isStale(snapshot)) snapshot = await this.getRateLimit();

      if (remainingPoints(snapshot) > this.#config.pointReserve) return;

      this.#onRateLimit?.(snapshot);
      const waitMs = msUntilReset(snapshot);
      if (!this.#waitForReset) throw new WclRateLimitError(Math.ceil(waitMs / 1000));

      await this.#sleep(waitMs);
      // Force a fresh read after the reset rather than trusting the old snapshot.
      this.#budget = undefined;
    }
  }

  /**
   * `enforceBudget` is false for the rate-limit query itself, which would
   * otherwise recurse into the budget check forever.
   */
  async #execute<TResult>(
    source: string,
    variables: Record<string, unknown> | undefined,
    enforceBudget: boolean,
  ): Promise<TResult> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.#maxAttempts; attempt += 1) {
      if (enforceBudget) await this.#ensureBudget();

      try {
        return await this.#semaphore.run(() => this.#send<TResult>(source, variables));
      } catch (error) {
        lastError = error;
        if (!this.#isRetryable(error) || attempt === this.#maxAttempts) throw error;

        // A 401 usually means the cached token expired early; drop it so the
        // next attempt fetches a fresh one.
        if (error instanceof WclHttpError && error.status === 401) this.#tokens.invalidate();

        await this.#sleep(this.#backoffMs(attempt, error));
      }
    }

    throw lastError;
  }

  async #send<TResult>(
    source: string,
    variables: Record<string, unknown> | undefined,
  ): Promise<TResult> {
    const token = await this.#tokens.getAccessToken();

    const response = await fetch(this.#config.clientEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(variables ? { query: source, variables } : { query: source }),
    });

    if (!response.ok) {
      const body = await response.text();
      const retryAfter = Number(response.headers.get('retry-after'));
      throw new WclHttpError(
        response.status,
        body,
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
      );
    }

    const payload = (await response.json()) as GraphQLResponse<TResult>;

    // A GraphQL error arrives with HTTP 200. Treating it as success would
    // silently produce partial data, so it is raised instead.
    if (payload.errors?.length) throw new WclGraphQLError(payload.errors);
    if (!payload.data) throw new WclGraphQLError([{ message: 'Response contained no data.' }]);

    return payload.data;
  }

  #isRetryable(error: unknown): boolean {
    if (error instanceof WclHttpError) return error.isRetryable || error.status === 401;
    // Network-level failures (DNS, reset connection, timeout) surface as TypeError.
    return error instanceof TypeError;
  }

  /** Exponential backoff with jitter; honours Retry-After when the API sends it. */
  #backoffMs(attempt: number, error: unknown): number {
    if (error instanceof WclHttpError && error.retryAfterSeconds !== undefined) {
      return error.retryAfterSeconds * 1000;
    }
    const base = Math.min(30_000, 500 * 2 ** (attempt - 1));
    return base + Math.random() * 250;
  }
}
