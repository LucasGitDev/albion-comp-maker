/**
 * Per-IP rate limiting for the anonymous editor API surfaces, `/api/items`
 * and `/api/icon` (ACM-072, follow-up to ACM-063 / decision-016).
 *
 * These two routes were deliberately EXCLUDED from the public-read bucket
 * (`src/lib/public-read-rate-limit.ts`) introduced by ACM-063: a single
 * legitimate editor page render fires dozens of `/api/icon` requests (one
 * per equipped item + one per ability icon, across every build in a comp)
 * plus a fetch to `/api/items`, and would burn through the public-read
 * budget (120 req/60s, sized for page views) almost immediately, producing
 * 429s during completely normal use. Each route gets its OWN fixed-window
 * budget here, sized for its own call profile instead of for page views.
 *
 * Both limiters reuse the shared engine (`fixed-window-limiter.ts`) so the
 * eviction/sweep logic fixed once in ACM-051 is not duplicated a third
 * time. Key derivation (`clientKeyFromHeaders`) is imported from the
 * public-read module rather than reimplemented — the anti-spoof XFF/hops
 * reasoning there applies identically here.
 */

import { NextResponse } from "next/server";
import { createFixedWindowLimiter } from "@/lib/fixed-window-limiter";
import { clientKeyFromHeaders, UNTRUSTED_KEY } from "@/lib/public-read-rate-limit";

export { clientKeyFromHeaders, UNTRUSTED_KEY };

const WINDOW_MS = 60_000;
const SWEEP_INTERVAL_MS = 5 * 60_000;
const MAX_BUCKETS = 10_000;

/**
 * `/api/items` serves the full ao-data.json catalogue: one comparatively
 * heavy request per editor page load (gzip ~63KB, see route.ts), revisited
 * via a cheap ETag 304 once the in-memory cache is warm — never one call
 * per icon. A generous-but-bounded budget of 30 req/60s comfortably covers
 * many editor tabs/reloads within a minute for one IP while still capping
 * a scripted scrape of the catalogue.
 */
export const ITEMS_MAX_PER_IP = 30;

/**
 * `/api/icon` is a per-icon CDN proxy: a single comp render can easily
 * request several dozen icons (every equipped item + every Q/W/E/passive
 * ability, across every build slot and every mandatory swap). Budget is
 * sized an order of magnitude above the items budget — and above the
 * public-read per-IP budget — to absorb that fan-out for one real editor
 * session within a window, while still bounding a scripted image-scrape.
 */
export const ICON_MAX_PER_IP = 600;

/**
 * Requests with no identifiable client IP (XFF absent/shorter than the
 * configured trusted-hop count) share a single, larger untrusted bucket
 * per route — same fail-degrade shape as the public-read limiter, so a
 * misconfigured/proxy-less deployment doesn't collapse every anonymous
 * caller into one tiny per-IP budget.
 */
export const ITEMS_UNTRUSTED_MAX = 150;
export const ICON_UNTRUSTED_MAX = 3_000;

const itemsPerIpLimiter = createFixedWindowLimiter({
  windowMs: WINDOW_MS,
  max: ITEMS_MAX_PER_IP,
  maxBuckets: MAX_BUCKETS,
  sweepIntervalMs: SWEEP_INTERVAL_MS,
});

const itemsUntrustedLimiter = createFixedWindowLimiter({
  windowMs: WINDOW_MS,
  max: ITEMS_UNTRUSTED_MAX,
  maxBuckets: 1,
  sweepIntervalMs: SWEEP_INTERVAL_MS,
});

const iconPerIpLimiter = createFixedWindowLimiter({
  windowMs: WINDOW_MS,
  max: ICON_MAX_PER_IP,
  maxBuckets: MAX_BUCKETS,
  sweepIntervalMs: SWEEP_INTERVAL_MS,
});

const iconUntrustedLimiter = createFixedWindowLimiter({
  windowMs: WINDOW_MS,
  max: ICON_UNTRUSTED_MAX,
  maxBuckets: 1,
  sweepIntervalMs: SWEEP_INTERVAL_MS,
});

/** Returns `true` if `key` is allowed one more `/api/items` request. */
export function checkItemsRateLimit(key: string, now?: number): boolean {
  if (key === UNTRUSTED_KEY) {
    return itemsUntrustedLimiter.check(key, now);
  }
  return itemsPerIpLimiter.check(key, now);
}

/** Returns `true` if `key` is allowed one more `/api/icon` request. */
export function checkIconRateLimit(key: string, now?: number): boolean {
  if (key === UNTRUSTED_KEY) {
    return iconUntrustedLimiter.check(key, now);
  }
  return iconPerIpLimiter.check(key, now);
}

/**
 * Constant 429 response for both editor API limiters. Nothing here is
 * derived from the request (query params, path, etc.), so a throttled
 * caller learns nothing beyond "too many requests" — same no-oracle shape
 * as the public-read limiter's `throttledResponse` (decision-016 AC#3).
 */
export function throttledApiResponse(): NextResponse {
  return new NextResponse("Too many requests", {
    status: 429,
    headers: {
      "Retry-After": "60",
      "Cache-Control": "no-store",
    },
  });
}

/** Test-only helper to reset all state between specs. */
export function __resetEditorApiRateLimitState(): void {
  itemsPerIpLimiter.reset();
  itemsUntrustedLimiter.reset();
  iconPerIpLimiter.reset();
  iconUntrustedLimiter.reset();
}
