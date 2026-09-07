import { describe, expect, it, vi } from "vitest";

// `src/middleware.ts` calls `auth(callback)` at module load time, so `@/auth`
// must be mocked before importing it. This mirrors next-auth's real
// `auth(handler)` signature: it invokes `handler` with a request-like object
// carrying `.auth` (the session, or null when unauthenticated).
vi.mock("@/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => handler,
}));

describe("middleware", () => {
  it("scopes the matcher to /builds/:path* and /comp/new only (allow-list, not global)", async () => {
    const { config } = await import("@/middleware");
    expect(config.matcher).toEqual(["/builds/:path*", "/comp/new"]);
  });

  it("redirects unauthenticated requests to / (AC#3)", async () => {
    const middleware = (await import("@/middleware")).default;

    const req = {
      auth: null,
      nextUrl: new URL("http://localhost:3000/builds/some-build"),
    };

    const res = (middleware as (r: unknown) => unknown)(req) as
      | Response
      | undefined;

    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(302);
    expect(res?.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("does not redirect authenticated requests", async () => {
    const middleware = (await import("@/middleware")).default;

    const req = {
      auth: { user: { id: "user-1" }, expires: "" },
      nextUrl: new URL("http://localhost:3000/comp/new"),
    };

    const res = (middleware as (r: unknown) => unknown)(req) as
      | Response
      | undefined;

    expect(res).toBeUndefined();
  });
});
