/** Thrown when the Warcraft Logs API answers with a non-2xx HTTP status. */
export class WclHttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    /** Seconds to wait, taken from a Retry-After header when present. */
    readonly retryAfterSeconds?: number,
  ) {
    super(`Warcraft Logs API returned HTTP ${status}: ${body.slice(0, 500)}`);
    this.name = 'WclHttpError';
  }

  /** 429 and 5xx are transient; 4xx otherwise means the request itself is wrong. */
  get isRetryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

/** Thrown when the response is HTTP 200 but carries GraphQL `errors`. */
export class WclGraphQLError extends Error {
  constructor(readonly errors: readonly { message: string; path?: readonly (string | number)[] }[]) {
    const detail = errors
      .map((e) => (e.path ? `${e.path.join('.')}: ${e.message}` : e.message))
      .join('; ');
    super(`Warcraft Logs GraphQL error: ${detail}`);
    this.name = 'WclGraphQLError';
  }
}

/** Thrown when the hourly point budget is exhausted and waiting is not allowed. */
export class WclRateLimitError extends Error {
  constructor(readonly resetInSeconds: number) {
    super(`Warcraft Logs point budget exhausted; resets in ${resetInSeconds}s.`);
    this.name = 'WclRateLimitError';
  }
}
