import { auth } from "@/auth";
import { checkPublicReadRateLimit, clientKeyFromHeaders } from "@/lib/public-read-rate-limit";

/**
 * Protects `/builds/:path*` and `/comp/new` (decision: allow-list matcher,
 * not a global one, so unrelated routes never pay the auth check cost or
 * risk being accidentally locked out). Server Actions self-check `auth()`
 * regardless of this middleware (see src/auth.ts callbacks comment) — this
 * is a UX redirect, not the sole security boundary.
 */
const authProxy = auth((req) => {
  if (!req.auth) {
    const url = new URL("/", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

// Literal editor-creation routes that must always go through the
// authenticated branch, never the public-read branch. `/build/new` and
// `/comp/new` both look like `/build/:slug` / `/comp/:slug` to the regex
// below, so they are checked against this list first (decision-016
// addendum: symmetric treatment, /build/new no longer spends the shared
// 120/60s public-read budget).
const AUTH_ONLY_LITERAL_PATHS = new Set(["/build/new", "/comp/new"]);

/**
 * Normalizes a pathname before the AUTH_ONLY_LITERAL_PATHS equality check:
 * percent-decodes it (so `/build/%6Ee%77` reads as `/build/new`, matching
 * what the Next.js router itself decodes and serves) and strips a single
 * trailing slash (so `/build/new/` matches too, mirroring the trailing-slash
 * tolerance already built into PUBLIC_READ_PATHS). Falls back to the raw
 * pathname on a malformed percent-escape — decodeURIComponent throws on
 * invalid sequences, and failing open into the auth-required branch is the
 * safe direction (worst case: an extra redirect, never a bypass).
 */
function normalizePathname(pathname: string): string {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }
  if (decoded.length > 1 && decoded.endsWith("/")) {
    decoded = decoded.slice(0, -1);
  }
  return decoded;
}

// A single segment after "build" or "comp" — `/build/:slug` / `/comp/:slug`
// — plus their ACM-022 OG-image counterparts, `/api/og/build/:slug` and
// `/api/og/comp/:slug`, which share the same anonymous-read shape (public
// content, no auth) and so share the same per-IP budget (decision-030).
// `/build/new` and `/comp/new` must be excluded here (checked before this
// regex in the router below via AUTH_ONLY_LITERAL_PATHS), otherwise the
// build/comp creation pages would be treated as anonymous public routes
// (decision-016).
const PUBLIC_READ_PATHS = /^\/(?:(?:api\/og\/)?(?:build|comp))\/[^/]+\/?$/;

/**
 * Constant 429 response for the public-read rate limiter. Nothing here is
 * derived from the path/slug — the proxy returns before any database
 * access, so slug-existent and slug-nonexistent requests are byte-identical
 * (decision-016 AC#3, no existence oracle).
 */
function throttledResponse(): Response {
  return new Response("Too many requests", {
    status: 429,
    headers: {
      "Retry-After": "60",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Routes between the public-read branch (per-IP throttle, no session
 * lookup) and the authenticated branch (`auth(handler)`). `/build/new` and
 * `/comp/new` are checked BEFORE the public-read path test, otherwise they
 * would match `/build/:slug` / `/comp/:slug` and be treated as public
 * routes. The public branch never calls `auth()`: an anonymous request
 * must not pay a session lookup against the SQLite-backed adapter
 * (decision-012).
 */
export default function proxy(
  req: Parameters<typeof authProxy>[0],
  ctx: Parameters<typeof authProxy>[1],
) {
  if (AUTH_ONLY_LITERAL_PATHS.has(normalizePathname(req.nextUrl.pathname))) {
    return authProxy(req, ctx);
  }

  if (PUBLIC_READ_PATHS.test(req.nextUrl.pathname)) {
    const key = clientKeyFromHeaders(req.headers);
    if (!checkPublicReadRateLimit(key)) {
      return throttledResponse();
    }
    return undefined;
  }

  return authProxy(req, ctx);
}

export const config = {
  matcher: [
    "/builds/:path*",
    "/comps/:path*",
    "/comp/new",
    "/build/:slug",
    "/comp/:slug",
    "/api/og/build/:slug",
    "/api/og/comp/:slug",
  ],
  // Database-strategy sessions require a real DB lookup (via
  // `@auth/drizzle-adapter` + better-sqlite3, a native Node addon), which
  // cannot run on the Edge runtime. No runtime opt-in is needed here: the
  // `proxy` file convention (Next.js 16+) always runs on the Node.js
  // runtime — setting `runtime` in this config is now a build error.
};
