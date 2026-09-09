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
 * Both limiters are built via the shared policy table
 * (`rate-limit-policy.ts`, ACM-084 / decision-029) so the eviction/sweep
 * logic fixed once in ACM-051, and the perIp/untrusted budget relationship,
 * are not duplicated a third time. Key derivation (`clientKeyFromHeaders`)
 * is imported from the public-read module rather than reimplemented — the
 * anti-spoof XFF/hops reasoning there applies identically here.
 */

import { NextResponse } from "next/server";
import { clientKeyFromHeaders } from "@/lib/public-read-rate-limit";
import { createSurfaceLimiter, RATE_LIMIT_POLICY, UNTRUSTED_KEY } from "@/lib/rate-limit-policy";

export { clientKeyFromHeaders, UNTRUSTED_KEY };

/**
 * `/api/items` serves the full ao-data.json catalogue: one comparatively
 * heavy request per editor page load (gzip ~63KB, see route.ts), revisited
 * via a cheap ETag 304 once the in-memory cache is warm — never one call
 * per icon. A generous-but-bounded budget of 30 req/60s comfortably covers
 * many editor tabs/reloads within a minute for one IP while still capping
 * a scripted scrape of the catalogue.
 */
export const ITEMS_MAX_PER_IP = RATE_LIMIT_POLICY.items.perIpMax;

/**
 * `/api/icon` is a per-icon CDN proxy: a single comp render can easily
 * request several dozen icons (every equipped item + every Q/W/E/passive
 * ability, across every build slot and every mandatory swap). Budget is
 * sized an order of magnitude above the items budget — and above the
 * public-read per-IP budget — to absorb that fan-out for one real editor
 * session within a window, while still bounding a scripted image-scrape.
 */
export const ICON_MAX_PER_IP = RATE_LIMIT_POLICY.icon.perIpMax;

/**
 * Requests with no identifiable client IP (XFF absent/shorter than the
 * configured trusted-hop count) share a single untrusted bucket per route,
 * capped at parity with the per-IP budget (decision-029) — omitting XFF
 * must never grant more quota than being individually identifiable.
 */
export const ITEMS_UNTRUSTED_MAX = RATE_LIMIT_POLICY.items.untrustedMax;
export const ICON_UNTRUSTED_MAX = RATE_LIMIT_POLICY.icon.untrustedMax;

const itemsLimiter = createSurfaceLimiter("items");
const iconLimiter = createSurfaceLimiter("icon");

/** Returns `true` if `key` is allowed one more `/api/items` request. */
export function checkItemsRateLimit(key: string, now?: number): boolean {
  return itemsLimiter.check(key, now);
}

/** Returns `true` if `key` is allowed one more `/api/icon` request. */
export function checkIconRateLimit(key: string, now?: number): boolean {
  return iconLimiter.check(key, now);
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
  itemsLimiter.reset();
  iconLimiter.reset();
}
