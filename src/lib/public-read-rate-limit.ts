/**
 * Per-IP rate limiter for the anonymous public read routes (`/build/:slug`,
 * `/comp/:slug`) — ACM-063 / decision-016. Built on the same shared engine
 * as the write limiter (`src/lib/fixed-window-limiter.ts`). Deliberately
 * has no `server-only` import: this module runs in `src/proxy.ts`, which
 * executes before any route handler and thus before any database access.
 */

import { createFixedWindowLimiter } from "@/lib/fixed-window-limiter";

export const PUBLIC_READ_WINDOW_MS = 60_000;
export const PUBLIC_READ_MAX_PER_IP = 120;
export const UNTRUSTED_KEY = "__untrusted__";
export const UNTRUSTED_MAX = 600;

const SWEEP_INTERVAL_MS = 5 * 60_000;
const MAX_BUCKETS = 10_000;

const perIpLimiter = createFixedWindowLimiter({
  windowMs: PUBLIC_READ_WINDOW_MS,
  max: PUBLIC_READ_MAX_PER_IP,
  maxBuckets: MAX_BUCKETS,
  sweepIntervalMs: SWEEP_INTERVAL_MS,
});

const untrustedLimiter = createFixedWindowLimiter({
  windowMs: PUBLIC_READ_WINDOW_MS,
  max: UNTRUSTED_MAX,
  // A single shared key never needs LRU eviction, but the cap is kept for
  // consistency with the engine's contract.
  maxBuckets: 1,
  sweepIntervalMs: SWEEP_INTERVAL_MS,
});

/**
 * Derives the rate-limit bucket key from `X-Forwarded-For`.
 *
 * The leftmost entry of XFF is client-controlled and trivially spoofable
 * (`curl -H 'x-forwarded-for: <anything>'`), so it is NEVER used as the
 * key. Instead, `RATE_LIMIT_TRUSTED_HOPS` (default `1`) counts how many
 * reverse proxies in front of this app are trusted to append the real peer
 * address, and the key is the N-th entry from the RIGHT of the header
 * (`parts[parts.length - hops]`). With `hops=1` and a single reverse proxy
 * that appends the real peer IP, any entries forged by the client end up to
 * the left of that position and are ignored.
 *
 * Two configuration failure modes (see decision-016 section 3):
 * - `hops` too high: the key becomes an attacker-chosen value, making the
 *   limiter ineffective, but no legitimate user is blocked.
 * - `hops` too low (most dangerous): the key collapses to the proxy's own
 *   IP, so ALL traffic shares one bucket and legitimate users get 429s.
 *
 * When XFF is absent or has fewer entries than `hops` (no identifiable
 * trusted client IP), the fallback is a shared `UNTRUSTED_KEY` bucket with
 * its own, more generous budget — this is neither fail-open (still capped)
 * nor a global fail-closed (identifiable traffic keeps its own buckets).
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  const parts = (xff ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const rawHops = parseInt(process.env.RATE_LIMIT_TRUSTED_HOPS ?? "1", 10);
  const hops = Number.isNaN(rawHops) || rawHops < 1 ? 1 : rawHops;

  if (parts.length >= hops) {
    return parts[parts.length - hops];
  }

  return UNTRUSTED_KEY;
}

/**
 * Returns `true` if `key` is allowed one more public-read request in the
 * current 60s window. `UNTRUSTED_KEY` is checked against its own, larger
 * budget so a misconfigured/proxy-less deployment degrades instead of
 * collapsing all traffic into the per-IP budget.
 */
export function checkPublicReadRateLimit(key: string, now?: number): boolean {
  if (key === UNTRUSTED_KEY) {
    return untrustedLimiter.check(key, now);
  }
  return perIpLimiter.check(key, now);
}

/** Test-only helper to reset all state between specs. */
export function __resetPublicReadRateLimitState(): void {
  perIpLimiter.reset();
  untrustedLimiter.reset();
}
