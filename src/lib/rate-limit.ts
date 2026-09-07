/**
 * In-memory fixed-window rate limiter for write Server Actions (ACM-018
 * AC#7: max 30 writes/min per user). Deliberately dependency-free — a
 * `Map` scoped to this module is enough for a single-process deployment.
 *
 * Limitation: state lives in process memory, so it resets on
 * redeploy/restart and is NOT shared across horizontally scaled instances
 * (single-process only). If the app is ever deployed with more than one
 * Node process, this must be replaced with a shared store (e.g. Redis).
 *
 * Eviction ordering: `Map` iteration follows insertion order, and merely
 * mutating a value (`bucket.count += 1`) does NOT move its key. To keep the
 * capacity backstop (`MAX_BUCKETS`) from evicting continuously-active users
 * instead of idle ones, every access re-inserts the key (`delete` + `set`)
 * so the map's order also reflects least-recently-used first. Capacity
 * eviction additionally sweeps expired windows before falling back to
 * evicting the least-recently-used bucket, since expired entries carry no
 * security meaning and are always safe to drop first.
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

function evictIfOverCapacity(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;

  // Expired windows carry no security meaning — drop them first. This is
  // O(n) but only runs once the map is already over MAX_BUCKETS, so it
  // can't be triggered on every request.
  for (const [userId, bucket] of buckets) {
    if (now - bucket.windowStart >= WINDOW_MS) {
      buckets.delete(userId);
    }
  }

  // Still over cap after sweeping expired windows: fall back to evicting
  // the least-recently-used bucket. Because every access re-inserts its
  // key (see `touch`), map order here reflects LRU, not insertion order.
  while (buckets.size > MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey === undefined) break;
    buckets.delete(oldestKey);
  }
}

/** Moves `userId`'s key to the end of the map so insertion order also
 * tracks recency of access, enabling LRU-style capacity eviction. */
function touch(userId: string, bucket: Bucket): void {
  buckets.delete(userId);
  buckets.set(userId, bucket);
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
    evictIfOverCapacity(now);
    return;
  }

  if (bucket.count >= MAX_WRITES_PER_WINDOW) {
    throw new RateLimitError();
  }

  bucket.count += 1;
  touch(userId, bucket);
}

/** Test-only helper to reset state between specs. */
export function __resetRateLimitState(): void {
  buckets.clear();
  lastSweep = Date.now();
}

/** Test-only helper to inspect a bucket without mutating map order. */
export function __peekBucketForTest(userId: string): Bucket | undefined {
  const bucket = buckets.get(userId);
  return bucket ? { ...bucket } : undefined;
}
