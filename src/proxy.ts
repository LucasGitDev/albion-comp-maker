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

// A single segment after "build" or "comp" — `/build/:slug` / `/comp/:slug`.
// `/comp/new` must be excluded here (checked before this regex in the
// router below), otherwise the build-creation page would be treated as an
// anonymous public route (decision-016).
const PUBLIC_READ_PATHS = /^\/(build|comp)\/[^/]+\/?$/;

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
 * lookup) and the authenticated branch (`auth(handler)`). `/comp/new` is
 * checked BEFORE the public-read path test, otherwise it would match
 * `/comp/:slug` and be treated as a public route. The public branch never
 * calls `auth()`: an anonymous request must not pay a session lookup
 * against the SQLite-backed adapter (decision-012).
 */
export default function proxy(
  req: Parameters<typeof authProxy>[0],
  ctx: Parameters<typeof authProxy>[1],
) {
  if (req.nextUrl.pathname === "/comp/new") {
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
  matcher: ["/builds/:path*", "/comps/:path*", "/comp/new", "/build/:slug", "/comp/:slug"],
  // Database-strategy sessions require a real DB lookup (via
  // `@auth/drizzle-adapter` + better-sqlite3, a native Node addon), which
  // cannot run on the Edge runtime. No runtime opt-in is needed here: the
  // `proxy` file convention (Next.js 16+) always runs on the Node.js
  // runtime — setting `runtime` in this config is now a build error.
};
