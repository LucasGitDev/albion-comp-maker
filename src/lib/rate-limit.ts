/**
 * In-memory fixed-window rate limiter for write Server Actions (ACM-018
 * AC#7: max 30 writes/min per user). Deliberately dependency-free — a
 * `Map` scoped to this module is enough for a single-process deployment.
 *
 * Limitation (documented per task notes): state lives in process memory, so
 * it resets on redeploy/restart and is NOT shared across horizontally
 * scaled instances. If the app is ever deployed with more than one Node
 * process, this must be replaced with a shared store (e.g. Redis).
 */

const WINDOW_MS = 60_000;
const MAX_WRITES_PER_WINDOW = 30;

type Bucket = {
  count: number;
  windowStart: number;
};

const buckets = new Map<string, Bucket>();

// Bounds memory: without this, every distinct userId that ever calls
// `checkWriteRateLimit` leaves a permanent entry in `buckets` for the
// process lifetime. Sweep expired windows periodically and, as a hard
// backstop, evict the oldest entries once the map grows past a cap.
const SWEEP_INTERVAL_MS = 5 * 60_000;
const MAX_BUCKETS = 10_000;
let lastSweep = Date.now();

function sweepExpiredBuckets(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;

  for (const [userId, bucket] of buckets) {
    if (now - bucket.windowStart >= WINDOW_MS) {
      buckets.delete(userId);
    }
  }
}

function evictOldestIfOverCapacity(): void {
  if (buckets.size <= MAX_BUCKETS) return;

  // Map preserves insertion order; the oldest bucket is not necessarily
  // the least-recently-used one, but this is only a hard backstop against
  // unbounded growth, not a precision LRU.
  const oldestKey = buckets.keys().next().value;
  if (oldestKey !== undefined) {
    buckets.delete(oldestKey);
  }
}

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
  sweepExpiredBuckets(now);

  const bucket = buckets.get(userId);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    buckets.set(userId, { count: 1, windowStart: now });
    evictOldestIfOverCapacity();
    return;
  }

  if (bucket.count >= MAX_WRITES_PER_WINDOW) {
    throw new RateLimitError();
  }

  bucket.count += 1;
}

/** Test-only helper to reset state between specs. */
export function __resetRateLimitState(): void {
  buckets.clear();
  lastSweep = Date.now();
}
