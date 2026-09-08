/**
 * Generic in-memory fixed-window rate limiter engine, extracted from
 * `src/lib/rate-limit.ts` (ACM-063 / decision-016) so the eviction logic
 * fixed once in ACM-051 is not duplicated by the public-read limiter
 * (`src/lib/public-read-rate-limit.ts`). Deliberately dependency-free and
 * free of any `server-only` import: this module also runs in `src/proxy.ts`,
 * which executes before any route handler.
 *
 * Limitation (inherited by every consumer): state lives in process memory,
 * so it resets on redeploy/restart and is NOT shared across horizontally
 * scaled instances (single-process only).
 *
 * Eviction ordering: `Map` iteration follows insertion order, and merely
 * mutating a value (`bucket.count += 1`) does NOT move its key. To keep the
 * capacity backstop (`maxBuckets`) from evicting continuously-active keys
 * instead of idle ones, every access re-inserts the key (`delete` + `set`)
 * so the map's order also reflects least-recently-used first. Capacity
 * eviction additionally sweeps expired windows before falling back to
 * evicting the least-recently-used bucket, since expired entries carry no
 * security meaning and are always safe to drop first.
 */

type Bucket = {
  count: number;
  windowStart: number;
};

export type FixedWindowLimiterOptions = {
  windowMs: number;
  max: number;
  maxBuckets: number;
  sweepIntervalMs: number;
};

export type FixedWindowLimiter = {
  /** Returns `true` if `key` is allowed one more request in the current window. */
  check(key: string, now?: number): boolean;
  /** Test-only helper to reset all state. */
  reset(): void;
  /** Test-only helper to inspect a bucket without mutating map order. */
  peek(key: string): Bucket | undefined;
};

export function createFixedWindowLimiter(options: FixedWindowLimiterOptions): FixedWindowLimiter {
  const { windowMs, max, maxBuckets, sweepIntervalMs } = options;

  const buckets = new Map<string, Bucket>();
  let lastSweep = Date.now();

  function sweepExpiredBuckets(now: number): void {
    if (now - lastSweep < sweepIntervalMs) return;
    lastSweep = now;

    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart >= windowMs) {
        buckets.delete(key);
      }
    }
  }

  function evictIfOverCapacity(now: number): void {
    if (buckets.size <= maxBuckets) return;

    // Expired windows carry no security meaning — drop them first. This is
    // O(n) but only runs once the map is already over maxBuckets, so it
    // can't be triggered on every request.
    for (const [key, bucket] of buckets) {
      if (now - bucket.windowStart >= windowMs) {
        buckets.delete(key);
      }
    }

    // Still over cap after sweeping expired windows: fall back to evicting
    // the least-recently-used bucket. Because every access re-inserts its
    // key (see `touch`), map order here reflects LRU, not insertion order.
    while (buckets.size > maxBuckets) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey === undefined) break;
      buckets.delete(oldestKey);
    }
  }

  /** Moves `key` to the end of the map so insertion order also tracks
   * recency of access, enabling LRU-style capacity eviction. */
  function touch(key: string, bucket: Bucket): void {
    buckets.delete(key);
    buckets.set(key, bucket);
  }

  return {
    check(key: string, now: number = Date.now()): boolean {
      sweepExpiredBuckets(now);

      const bucket = buckets.get(key);

      if (!bucket || now - bucket.windowStart >= windowMs) {
        buckets.set(key, { count: 1, windowStart: now });
        evictIfOverCapacity(now);
        return true;
      }

      if (bucket.count >= max) {
        return false;
      }

      bucket.count += 1;
      touch(key, bucket);
      return true;
    },
    reset(): void {
      buckets.clear();
      lastSweep = Date.now();
    },
    peek(key: string): Bucket | undefined {
      const bucket = buckets.get(key);
      return bucket ? { ...bucket } : undefined;
    },
  };
}
