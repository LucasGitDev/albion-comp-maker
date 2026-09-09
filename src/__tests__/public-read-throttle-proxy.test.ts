import { afterEach, describe, expect, it, vi } from "vitest";

// Mirrors auth-middleware.test.ts's mock: `src/proxy.ts` calls `auth(callback)`
// at module load time, so `@/auth` must be mocked before importing it.
vi.mock("@/auth", () => ({
  auth: (handler: (req: unknown) => unknown) => handler,
}));

const getPublicBuildBySlug = vi.fn();
vi.mock("@/lib/public-content", () => ({
  getPublicBuildBySlug: (...args: unknown[]) => getPublicBuildBySlug(...args),
}));

function makeRequest(pathname: string, xff = "203.0.113.1") {
  return {
    auth: null,
    nextUrl: new URL(`http://localhost:3000${pathname}`),
    headers: new Headers({ "x-forwarded-for": xff }),
  };
}

describe("public read throttle (proxy)", () => {
  afterEach(async () => {
    getPublicBuildBySlug.mockClear();
    const { __resetPublicReadRateLimitState } = await import("@/lib/public-read-rate-limit");
    __resetPublicReadRateLimitState();
  });

  it("returns a constant 429 once the per-IP budget is exceeded", async () => {
    const proxy = (await import("@/proxy")).default;
    const { PUBLIC_READ_MAX_PER_IP } = await import("@/lib/public-read-rate-limit");

    let last: unknown;
    for (let i = 0; i < PUBLIC_READ_MAX_PER_IP + 1; i++) {
      last = (proxy as (r: unknown) => unknown)(makeRequest("/build/abc12345"));
    }

    expect(last).toBeInstanceOf(Response);
    const res = last as Response;
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns an identical 429 for an existing and a nonexistent slug (no existence oracle, AC#3)", async () => {
    const proxy = (await import("@/proxy")).default;
    const { PUBLIC_READ_MAX_PER_IP } = await import("@/lib/public-read-rate-limit");

    for (let i = 0; i < PUBLIC_READ_MAX_PER_IP; i++) {
      (proxy as (r: unknown) => unknown)(makeRequest("/build/existing-slug"));
    }

    const throttledExisting = (proxy as (r: unknown) => unknown)(
      makeRequest("/build/existing-slug"),
    ) as Response;
    const throttledMissing = (proxy as (r: unknown) => unknown)(
      makeRequest("/build/does-not-exist"),
    ) as Response;

    expect(throttledExisting.status).toBe(throttledMissing.status);
    expect(await throttledExisting.text()).toBe(await throttledMissing.text());
    expect(throttledExisting.headers.get("Retry-After")).toBe(
      throttledMissing.headers.get("Retry-After"),
    );
    expect(throttledExisting.headers.get("Cache-Control")).toBe(
      throttledMissing.headers.get("Cache-Control"),
    );
  });

  it("does not throttle /comp/new even after the same IP's public-read bucket is exhausted (route-order regression)", async () => {
    const proxy = (await import("@/proxy")).default;
    const { PUBLIC_READ_MAX_PER_IP } = await import("@/lib/public-read-rate-limit");

    for (let i = 0; i < PUBLIC_READ_MAX_PER_IP + 5; i++) {
      (proxy as (r: unknown) => unknown)(makeRequest("/build/abc12345"));
    }

    const res = (proxy as (r: unknown) => unknown)(makeRequest("/comp/new")) as
      | Response
      | undefined;

    // Unauthenticated -> auth branch redirects to "/", never a 429.
    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(302);
  });

  it("does not throttle /build/new even after the same IP's public-read bucket is exhausted (symmetric with /comp/new, decision-016)", async () => {
    const proxy = (await import("@/proxy")).default;
    const { PUBLIC_READ_MAX_PER_IP } = await import("@/lib/public-read-rate-limit");

    for (let i = 0; i < PUBLIC_READ_MAX_PER_IP + 5; i++) {
      (proxy as (r: unknown) => unknown)(makeRequest("/build/abc12345"));
    }

    const res = (proxy as (r: unknown) => unknown)(makeRequest("/build/new")) as
      | Response
      | undefined;

    // Unauthenticated -> auth branch redirects to "/", never a 429.
    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(302);
  });

  it("routes both /build/new and /comp/new to the auth branch (not the public-read regex match)", async () => {
    const proxy = (await import("@/proxy")).default;

    const buildRes = (proxy as (r: unknown) => unknown)(
      makeRequest("/build/new"),
    ) as Response | undefined;
    const compRes = (proxy as (r: unknown) => unknown)(
      makeRequest("/comp/new"),
    ) as Response | undefined;

    expect(buildRes).toBeInstanceOf(Response);
    expect(buildRes?.status).toBe(302);
    expect(compRes).toBeInstanceOf(Response);
    expect(compRes?.status).toBe(302);
  });

  it("still routes /build/:slug (non-'new' slug) to the public-read branch", async () => {
    const proxy = (await import("@/proxy")).default;

    const res = (proxy as (r: unknown) => unknown)(makeRequest("/build/not-new"));

    expect(res).toBeUndefined();
  });

  it("routes /builds/anything to the auth branch, not the public-read branch", async () => {
    const proxy = (await import("@/proxy")).default;

    const res = (proxy as (r: unknown) => unknown)(
      makeRequest("/builds/some-build"),
    ) as Response | undefined;

    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(302);
  });

  it("returns undefined (passes through) for a request under the limit", async () => {
    const proxy = (await import("@/proxy")).default;

    const res = (proxy as (r: unknown) => unknown)(makeRequest("/build/abc12345"));

    expect(res).toBeUndefined();
  });
});
