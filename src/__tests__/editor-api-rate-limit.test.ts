import { afterEach, describe, expect, it } from "vitest";
import {
  checkIconRateLimit,
  checkItemsRateLimit,
  ICON_MAX_PER_IP,
  ITEMS_MAX_PER_IP,
  UNTRUSTED_KEY,
  __resetEditorApiRateLimitState,
} from "@/lib/editor-api-rate-limit";

describe("editor-api-rate-limit", () => {
  afterEach(() => {
    __resetEditorApiRateLimitState();
  });

  it("allows ITEMS_MAX_PER_IP /api/items requests then denies the next one", () => {
    const key = "10.0.0.1";
    const t0 = Date.now();

    for (let i = 0; i < ITEMS_MAX_PER_IP; i++) {
      expect(checkItemsRateLimit(key, t0 + i)).toBe(true);
    }
    expect(checkItemsRateLimit(key, t0 + ITEMS_MAX_PER_IP)).toBe(false);
  });

  it("allows ICON_MAX_PER_IP /api/icon requests then denies the next one", () => {
    const key = "10.0.0.2";
    const t0 = Date.now();

    for (let i = 0; i < ICON_MAX_PER_IP; i++) {
      expect(checkIconRateLimit(key, t0 + i)).toBe(true);
    }
    expect(checkIconRateLimit(key, t0 + ICON_MAX_PER_IP)).toBe(false);
  });

  it("keeps a separate budget per route: exhausting /api/items does not affect /api/icon for the same IP", () => {
    const key = "10.0.0.3";
    const t0 = Date.now();

    for (let i = 0; i < ITEMS_MAX_PER_IP; i++) {
      checkItemsRateLimit(key, t0 + i);
    }
    expect(checkItemsRateLimit(key, t0 + ITEMS_MAX_PER_IP)).toBe(false);

    // Same IP, same instant, unrelated route: still has its full budget.
    expect(checkIconRateLimit(key, t0 + ITEMS_MAX_PER_IP)).toBe(true);
  });

  it("releases the same key after the window elapses (time injected, no fake timers)", () => {
    const key = "10.0.0.4";
    const t0 = Date.now();

    for (let i = 0; i < ICON_MAX_PER_IP; i++) {
      checkIconRateLimit(key, t0 + i);
    }
    expect(checkIconRateLimit(key, t0 + ICON_MAX_PER_IP)).toBe(false);

    expect(checkIconRateLimit(key, t0 + 60_000)).toBe(true);
  });

  it("keeps a second IP passing after the first one is exhausted (per-IP keying)", () => {
    const first = "10.0.0.5";
    const second = "10.0.0.6";
    const t0 = Date.now();

    for (let i = 0; i < ITEMS_MAX_PER_IP; i++) {
      checkItemsRateLimit(first, t0 + i);
    }
    expect(checkItemsRateLimit(first, t0 + ITEMS_MAX_PER_IP)).toBe(false);
    expect(checkItemsRateLimit(second, t0 + ITEMS_MAX_PER_IP)).toBe(true);
  });

  it("routes requests with no identifiable IP into the shared untrusted bucket, not the per-IP one", () => {
    const t0 = Date.now();

    for (let i = 0; i < ITEMS_MAX_PER_IP; i++) {
      checkItemsRateLimit(UNTRUSTED_KEY, t0 + i);
    }
    // Untrusted budget for /api/items is larger than the per-IP one, so it
    // must still be allowing requests past ITEMS_MAX_PER_IP.
    expect(checkItemsRateLimit(UNTRUSTED_KEY, t0 + ITEMS_MAX_PER_IP)).toBe(true);
  });
});
