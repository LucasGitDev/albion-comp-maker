import { auth } from "@/auth";

/**
 * Protects `/builds/:path*` and `/comp/new` (decision: allow-list matcher,
 * not a global one, so unrelated routes never pay the auth check cost or
 * risk being accidentally locked out). Server Actions self-check `auth()`
 * regardless of this middleware (see src/auth.ts callbacks comment) — this
 * is a UX redirect, not the sole security boundary.
 */
export default auth((req) => {
  if (!req.auth) {
    const url = new URL("/", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/builds/:path*", "/comp/new"],
  // Database-strategy sessions require a real DB lookup (via
  // `@auth/drizzle-adapter` + better-sqlite3, a native Node addon), which
  // cannot run on the Edge runtime. No runtime opt-in is needed here: the
  // `proxy` file convention (Next.js 16+) always runs on the Node.js
  // runtime — setting `runtime` in this config is now a build error.
};
