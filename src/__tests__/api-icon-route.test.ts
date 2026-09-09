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

  it("rejects a type that is neither item nor spell", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/icon/route");
    const response = await GET(makeRequest("type=weapon&id=T4_HEAD_PLATE_SET1", "8.8.8.11"));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to quality=1 for an out-of-range q param", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, body: new ReadableStream() });
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/icon/route");
    const response = await GET(makeRequest("type=item&id=T4_HEAD_PLATE_SET1&q=99", "8.8.8.12"));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("quality=1"));
  });

  it("requests a spell icon (no quality param) for type=spell", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, body: new ReadableStream() });
    vi.stubGlobal("fetch", fetchMock);

    const { GET } = await import("@/app/api/icon/route");
    const response = await GET(makeRequest("type=spell&id=SWORD_Q_SPELL", "8.8.8.13"));
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/spell/SWORD_Q_SPELL.png"));
  });

  it("falls back to a transparent PNG when upstream responds not-ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, body: null }));

    const { GET } = await import("@/app/api/icon/route");
    const response = await GET(makeRequest("type=item&id=T4_HEAD_PLATE_SET1", "8.8.8.14"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("falls back to a transparent PNG when the upstream fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { GET } = await import("@/app/api/icon/route");
    const response = await GET(makeRequest("type=item&id=T4_HEAD_PLATE_SET1", "8.8.8.15"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });
});
