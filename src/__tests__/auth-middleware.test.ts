import { afterEach, describe, expect, it, vi } from "vitest";

import { __resetPublicReadRateLimitState } from "@/lib/public-read-rate-limit";

// `src/proxy.ts` calls `auth(callback)` at module load time, so `@/auth`
// must be mocked before importing it. This mirrors next-auth's real
// `auth(handler)` signature: it invokes `handler` with a request-like object
// carrying `.auth` (the session, or null when unauthenticated).
vi.mock("@/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => handler,
}));

afterEach(() => {
  __resetPublicReadRateLimitState();
});

describe("middleware", () => {
  it("scopes the matcher to /builds/:path*, /comps/:path*, /comp/new, /build/:slug, /comp/:slug and the ACM-022 OG routes (allow-list, not global)", async () => {
    const { config } = await import("@/proxy");
    expect(config.matcher).toEqual([
      "/builds/:path*",
      "/comps/:path*",
      "/comp/new",
      "/build/:slug",
      "/comp/:slug",
      "/api/og/build/:slug",
      "/api/og/comp/:slug",
    ]);
  });

  it("redirects unauthenticated requests to / (AC#3)", async () => {
    const middleware = (await import("@/proxy")).default;

    const req = {
      auth: null,
      nextUrl: new URL("http://localhost:3000/builds/some-build"),
      headers: new Headers(),
    };

    const res = (
      middleware as (r: unknown) => unknown
    )(req) as Response | undefined;

    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(302);
    expect(res?.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects unauthenticated requests to /comps (never treated as a public-read route, ACM-066)", async () => {
    const middleware = (await import("@/proxy")).default;

    const req = {
      auth: null,
      nextUrl: new URL("http://localhost:3000/comps/abc123"),
      headers: new Headers(),
    };

    const res = (
      middleware as (r: unknown) => unknown
    )(req) as Response | undefined;

    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(302);
    expect(res?.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("does not redirect authenticated requests", async () => {
    const middleware = (await import("@/proxy")).default;

    const req = {
      auth: { user: { id: "user-1" }, expires: "" },
      nextUrl: new URL("http://localhost:3000/comp/new"),
      headers: new Headers(),
    };

    const res = (
      middleware as (r: unknown) => unknown
    )(req) as Response | undefined;

    expect(res).toBeUndefined();
  });
});
