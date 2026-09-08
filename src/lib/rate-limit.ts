/**
 * Fixed-window rate limiter for write Server Actions (ACM-018 AC#7: max 30
 * writes/min per user). Thin wrapper around the shared engine in
 * `src/lib/fixed-window-limiter.ts` (extracted in ACM-063 so the eviction
 * logic fixed once in ACM-051 is not duplicated by the public-read limiter)
 * that preserves this module's original public API.
 *
 * See `fixed-window-limiter.ts` for the eviction/sweep rationale.
 */

import { createFixedWindowLimiter } from "@/lib/fixed-window-limiter";

const WINDOW_MS = 60_000;
const MAX_WRITES_PER_WINDOW = 30;
const SWEEP_INTERVAL_MS = 5 * 60_000;
const MAX_BUCKETS = 10_000;

const limiter = createFixedWindowLimiter({
  windowMs: WINDOW_MS,
  max: MAX_WRITES_PER_WINDOW,
  maxBuckets: MAX_BUCKETS,
  sweepIntervalMs: SWEEP_INTERVAL_MS,
});

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Try again in a minute.") {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Throws `RateLimitError` once `userId` has made more than
 * `MAX_WRITES_PER_WINDOW` writes within the current 60s fixed window.
 * Call this at the top of every mutating Server Action, after
 * `requireSession()`.
 */
export function checkWriteRateLimit(userId: string, now: number = Date.now()): void {
  if (!limiter.check(userId, now)) {
    throw new RateLimitError();
  }
}

/** Test-only helper to reset state between specs. */
export function __resetRateLimitState(): void {
  limiter.reset();
}

/** Test-only helper to inspect a bucket without mutating map order. */
export function __peekBucketForTest(userId: string) {
  return limiter.peek(userId);
}
