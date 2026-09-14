/**
 * Warcraft Logs meters API usage in "points" per hour rather than in requests:
 * a heavy query costs more than a light one. The live budget is readable from
 * the API itself via `rateLimitData`.
 */
export interface RateLimitSnapshot {
  limitPerHour: number;
  pointsSpentThisHour: number;
  /** Seconds until the hourly budget resets. */
  pointsResetIn: number;
  /** Epoch milliseconds at which this snapshot was taken. */
  observedAt: number;
}

export function remainingPoints(snapshot: RateLimitSnapshot): number {
  return Math.max(0, snapshot.limitPerHour - snapshot.pointsSpentThisHour);
}

/**
 * A snapshot goes stale quickly because other processes (or our own parallel
 * requests) also spend points. Re-read it rather than extrapolating.
 */
export function isStale(snapshot: RateLimitSnapshot, maxAgeMs = 60_000): boolean {
  return Date.now() - snapshot.observedAt > maxAgeMs;
}

/** Milliseconds to wait for the hourly budget to reset, plus a small cushion. */
export function msUntilReset(snapshot: RateLimitSnapshot): number {
  const elapsed = Date.now() - snapshot.observedAt;
  return Math.max(0, snapshot.pointsResetIn * 1000 - elapsed) + 2_000;
}
