import { afterEach, describe, expect, it, vi } from "vitest";

describe("public-read-rate-limit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("allows PUBLIC_READ_MAX_PER_IP requests then denies the next one, with time injected", async () => {
    const {
      checkPublicReadRateLimit,
      PUBLIC_READ_MAX_PER_IP,
      __resetPublicReadRateLimitState,
    } = await import("@/lib/public-read-rate-limit");
    __resetPublicReadRateLimitState();

    const key = "1.2.3.4";
    const t0 = Date.now();

    for (let i = 0; i < PUBLIC_READ_MAX_PER_IP; i++) {
      expect(checkPublicReadRateLimit(key, t0 + i)).toBe(true);
    }

    expect(checkPublicReadRateLimit(key, t0 + PUBLIC_READ_MAX_PER_IP)).toBe(false);
  });

  it("keeps a second IP passing after the first one is exhausted (per-IP keying, AC#1)", async () => {
    const {
      checkPublicReadRateLimit,
      PUBLIC_READ_MAX_PER_IP,
      __resetPublicReadRateLimitState,
    } = await import("@/lib/public-read-rate-limit");
    __resetPublicReadRateLimitState();

    const first = "1.1.1.1";
    const second = "2.2.2.2";
    const t0 = Date.now();

    for (let i = 0; i < PUBLIC_READ_MAX_PER_IP; i++) {
      checkPublicReadRateLimit(first, t0 + i);
    }
    expect(checkPublicReadRateLimit(first, t0 + PUBLIC_READ_MAX_PER_IP)).toBe(false);

    expect(checkPublicReadRateLimit(second, t0 + PUBLIC_READ_MAX_PER_IP)).toBe(true);
  });

  it("releases the same key after the window elapses (time injected, no fake timers)", async () => {
    const {
      checkPublicReadRateLimit,
      PUBLIC_READ_MAX_PER_IP,
      PUBLIC_READ_WINDOW_MS,
      __resetPublicReadRateLimitState,
    } = await import("@/lib/public-read-rate-limit");
    __resetPublicReadRateLimitState();

    const key = "3.3.3.3";
    const t0 = Date.now();

    for (let i = 0; i < PUBLIC_READ_MAX_PER_IP; i++) {
      checkPublicReadRateLimit(key, t0 + i);
    }
    expect(checkPublicReadRateLimit(key, t0 + PUBLIC_READ_MAX_PER_IP)).toBe(false);

    expect(checkPublicReadRateLimit(key, t0 + PUBLIC_READ_WINDOW_MS)).toBe(true);
  });

  it("derives the key from the rightmost trusted hop of X-Forwarded-For, ignoring forged prepended entries (anti-spoof)", async () => {
    vi.stubEnv("RATE_LIMIT_TRUSTED_HOPS", "1");
    vi.resetModules();
    const { clientKeyFromHeaders } = await import("@/lib/public-read-rate-limit");

    const genuine = new Headers({
      "x-forwarded-for": "9.9.9.9, 1.1.1.1, 2.2.2.2",
    });
    const spoofed = new Headers({
      "x-forwarded-for": "6.6.6.6, 9.9.9.9, 1.1.1.1, 2.2.2.2",
    });

    expect(clientKeyFromHeaders(genuine)).toBe("2.2.2.2");
    expect(clientKeyFromHeaders(spoofed)).toBe(clientKeyFromHeaders(genuine));
  });

  it("uses the configured hop count to pick a different position", async () => {
    vi.stubEnv("RATE_LIMIT_TRUSTED_HOPS", "2");
    vi.resetModules();
    const { clientKeyFromHeaders } = await import("@/lib/public-read-rate-limit");

    const headers = new Headers({
      "x-forwarded-for": "9.9.9.9, 1.1.1.1, 2.2.2.2",
    });

    expect(clientKeyFromHeaders(headers)).toBe("1.1.1.1");
  });

  it("falls back to the untrusted bucket when XFF is absent, and does not share its counter with a real IP", async () => {
    const {
      checkPublicReadRateLimit,
      clientKeyFromHeaders,
      UNTRUSTED_KEY,
      UNTRUSTED_MAX,
      __resetPublicReadRateLimitState,
    } = await import("@/lib/public-read-rate-limit");
    __resetPublicReadRateLimitState();

    const key = clientKeyFromHeaders(new Headers());
    expect(key).toBe(UNTRUSTED_KEY);

    const t0 = Date.now();
    for (let i = 0; i < UNTRUSTED_MAX; i++) {
      checkPublicReadRateLimit(UNTRUSTED_KEY, t0 + i);
    }
    expect(checkPublicReadRateLimit(UNTRUSTED_KEY, t0 + UNTRUSTED_MAX)).toBe(false);

    expect(checkPublicReadRateLimit("2.2.2.2", t0 + UNTRUSTED_MAX)).toBe(true);
  });
});
