/**
 * Per-IP rate limiter for the anonymous public read routes (`/build/:slug`,
 * `/comp/:slug`) — ACM-063 / decision-016. Built on the shared policy table
 * (`rate-limit-policy.ts`, ACM-084 / decision-029). Deliberately has no
 * `server-only` import: this module runs in `src/proxy.ts`, which executes
 * before any route handler and thus before any database access.
 */

import { createSurfaceLimiter, RATE_LIMIT_POLICY, UNTRUSTED_KEY } from "@/lib/rate-limit-policy";
import { recordClientKeyOutcome } from "@/lib/untrusted-traffic-monitor";

export { UNTRUSTED_KEY };

export const PUBLIC_READ_WINDOW_MS = RATE_LIMIT_POLICY.publicRead.windowMs;
export const PUBLIC_READ_MAX_PER_IP = RATE_LIMIT_POLICY.publicRead.perIpMax;
export const UNTRUSTED_MAX = RATE_LIMIT_POLICY.publicRead.untrustedMax;

const publicReadLimiter = createSurfaceLimiter("publicRead");

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
 * trusted client IP), the fallback is a shared `UNTRUSTED_KEY` bucket whose
 * budget is capped at parity with the per-IP budget, never above it
 * (decision-029) — this is neither fail-open nor a global fail-closed
 * (identifiable traffic keeps its own buckets).
 *
 * Every outcome is also recorded by `untrusted-traffic-monitor.ts`: this is
 * the single call-through point for every throttled surface, so it is the
 * one place a misconfigured `RATE_LIMIT_TRUSTED_HOPS` (which pushes ALL
 * traffic into the untrusted bucket) can be made observable without
 * instrumenting every call site individually.
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
    const key = parts[parts.length - hops];
    recordClientKeyOutcome(false);
    return key;
  }

  recordClientKeyOutcome(true);
  return UNTRUSTED_KEY;
}

/**
 * Returns `true` if `key` is allowed one more public-read request in the
 * current 60s window. `UNTRUSTED_KEY` is checked against its own shared
 * budget, capped at parity with the per-IP budget (decision-029) so
 * omitting XFF never grants more quota than being individually
 * identifiable.
 */
export function checkPublicReadRateLimit(key: string, now?: number): boolean {
  return publicReadLimiter.check(key, now);
}

/** Test-only helper to reset all state between specs. */
export function __resetPublicReadRateLimitState(): void {
  publicReadLimiter.reset();
}
