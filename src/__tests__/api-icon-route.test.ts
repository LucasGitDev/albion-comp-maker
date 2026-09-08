import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("GET /api/icon", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  function makeRequest(params: string, xff = "8.8.8.8"): never {
    return new Request(`http://localhost/api/icon?${params}`, {
      headers: { "x-forwarded-for": xff },
    }) as never;
  }

  it("proxies a valid item icon request upstream", async () => {
    const upstreamBody = new ReadableStream();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, body: upstreamBody })
    );

    const { GET } = await import("@/app/api/icon/route");
    const response = await GET(makeRequest("type=item&id=T4_HEAD_PLATE_SET1&q=1"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("throttles a single IP past its own /api/icon budget (ACM-072), independent of /api/items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, body: new ReadableStream() })
    );

    const { GET } = await import("@/app/api/icon/route");
    const { ICON_MAX_PER_IP } = await import("@/lib/editor-api-rate-limit");

    for (let i = 0; i < ICON_MAX_PER_IP; i++) {
      const response = await GET(makeRequest("type=item&id=T4_HEAD_PLATE_SET1&q=1", "8.8.8.9"));
      expect(response.status).not.toBe(429);
    }

    const throttled = await GET(makeRequest("type=item&id=T4_HEAD_PLATE_SET1&q=1", "8.8.8.9"));
    expect(throttled.status).toBe(429);
    expect(throttled.headers.get("Cache-Control")).toBe("no-store");
    expect(throttled.headers.get("Retry-After")).toBe("60");
  });

  it("rejects invalid ids before hitting the rate limiter or upstream", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/icon/route");
    const response = await GET(makeRequest("type=item&id=not-valid", "8.8.8.10"));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
