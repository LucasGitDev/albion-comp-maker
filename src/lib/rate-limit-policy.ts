/**
 * Declarative per-IP / untrusted-bucket rate-limit policy table (ACM-084 /
 * decision-029), consumed by `public-read-rate-limit.ts` and
 * `editor-api-rate-limit.ts` via `createSurfaceLimiter`. Replaces two
 * hand-written copies of the same "perIp + untrusted shared bucket" shape
 * (decision-016 for `publicRead`, ACM-072 for `items`/`icon`), which is how
 * the untrusted bucket ended up with a budget larger than the per-IP one in
 * both places: nothing enforced the relationship between the two numbers.
 *
 * Invariant: `untrustedMax` must never exceed `perIpMax`. Omitting
 * `X-Forwarded-For` (or a misconfigured `RATE_LIMIT_TRUSTED_HOPS`) must
 * never grant MORE quota than being individually identifiable — seeded by
 * the ACM-084 audit finding. The invariant is enforced at module load
 * (`resolvePolicy`, clamp + `console.error`, never throws) and re-checked by
 * a unit test that walks this table so a future surface can't reintroduce
 * the defect by copy-paste.
 */

import { createFixedWindowLimiter, type FixedWindowLimiter } from "@/lib/fixed-window-limiter";

export const UNTRUSTED_KEY = "__untrusted__";

export type ThrottleSurface = "publicRead" | "items" | "icon";

export type SurfacePolicy = {
  windowMs: number;
  perIpMax: number;
  untrustedMax: number;
};

/**
 * Every surface with an anonymous throttle: `/build/:slug`, `/comp/:slug`
 * and `/api/background/[id]` share `publicRead` (they reuse the same public
 * read budget), `/api/items` is `items`, `/api/icon` is `icon`
 * (decision-029 AC#4). `untrustedMax === perIpMax` everywhere: parity is the
 * chosen budget, not a placeholder (decision-029 section "1").
 */
export const RATE_LIMIT_POLICY: Record<ThrottleSurface, SurfacePolicy> = {
  publicRead: { windowMs: 60_000, perIpMax: 120, untrustedMax: 120 },
  items: { windowMs: 60_000, perIpMax: 30, untrustedMax: 30 },
  icon: { windowMs: 60_000, perIpMax: 600, untrustedMax: 600 },
};

const SWEEP_INTERVAL_MS = 5 * 60_000;
const MAX_PER_IP_BUCKETS = 10_000;

/**
 * Clamps `untrustedMax` down to `perIpMax` and logs loudly if a policy
 * violates the invariant. Clamping (not throwing) keeps a misconfigured
 * table from taking the whole app down; `console.error` makes the
 * misconfiguration loud in any log aggregator instead of failing silently
 * in the direction that matters least (over-permissive untrusted bucket).
 */
function resolvePolicy(surface: ThrottleSurface): SurfacePolicy {
  const policy = RATE_LIMIT_POLICY[surface];

  if (policy.untrustedMax > policy.perIpMax) {
    console.error(
      JSON.stringify({
        event: "rate_limit_policy_invariant_violated",
        surface,
        untrustedMax: policy.untrustedMax,
        perIpMax: policy.perIpMax,
        action: "Clamping untrustedMax to perIpMax; fix rate-limit-policy.ts.",
      }),
    );
    return { ...policy, untrustedMax: policy.perIpMax };
  }

  return policy;
}

export type SurfaceLimiter = {
  /** Returns `true` if `key` is allowed one more request in the current window. */
  check(key: string, now?: number): boolean;
  /** Test-only helper to reset all state for this surface's limiters. */
  reset(): void;
};

/**
 * Builds the pair of fixed-window limiters (per-IP + shared untrusted) for
 * one throttle surface, encapsulating the `key === UNTRUSTED_KEY` branch so
 * callers never construct the untrusted budget by hand.
 */
export function createSurfaceLimiter(surface: ThrottleSurface): SurfaceLimiter {
  const policy = resolvePolicy(surface);

  const perIpLimiter: FixedWindowLimiter = createFixedWindowLimiter({
    windowMs: policy.windowMs,
    max: policy.perIpMax,
    maxBuckets: MAX_PER_IP_BUCKETS,
    sweepIntervalMs: SWEEP_INTERVAL_MS,
  });

  const untrustedLimiter: FixedWindowLimiter = createFixedWindowLimiter({
    windowMs: policy.windowMs,
    max: policy.untrustedMax,
    // A single shared key never needs LRU eviction, but the cap is kept for
    // consistency with the engine's contract.
    maxBuckets: 1,
    sweepIntervalMs: SWEEP_INTERVAL_MS,
  });

  return {
    check(key: string, now?: number): boolean {
      if (key === UNTRUSTED_KEY) {
        return untrustedLimiter.check(key, now);
      }
      return perIpLimiter.check(key, now);
    },
    reset(): void {
      perIpLimiter.reset();
      untrustedLimiter.reset();
    },
  };
}
