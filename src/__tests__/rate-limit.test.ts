import { afterEach, describe, expect, it } from "vitest";

import {
  __peekBucketForTest,
  __resetRateLimitState,
  checkWriteRateLimit,
} from "@/lib/rate-limit";

const MAX_BUCKETS = 10_000;

describe("checkWriteRateLimit eviction", () => {
  afterEach(() => {
    __resetRateLimitState();
  });

  it("does not reset the window/count of a continuously-active user when the map exceeds capacity", () => {
    const activeUserId = "active-user";
    const t0 = Date.now();

    // Active user is the very first bucket inserted — under a pure
    // insertion-order eviction scheme this makes it the first victim.
    checkWriteRateLimit(activeUserId, t0);
    checkWriteRateLimit(activeUserId, t0 + 1);

    // Push the map well past MAX_BUCKETS with distinct throwaway users,
    // touching the active user's bucket periodically so it keeps being
    // the most-recently-used entry.
    for (let i = 0; i < MAX_BUCKETS + 500; i++) {
      checkWriteRateLimit(`throwaway-${i}`, t0 + 2 + i);
      if (i % 2000 === 0) {
        checkWriteRateLimit(activeUserId, t0 + 2 + i);
      }
    }

    const bucket = __peekBucketForTest(activeUserId);
    expect(bucket).toBeDefined();
    // If the active user's bucket had been evicted (insertion-order bug),
    // the next call would silently re-create it with count reset to 1 and
    // a fresh windowStart. Assert it was never re-created: windowStart
    // must still match the very first call, and count must reflect every
    // touch (2 initial + one per loop iteration where i % 2000 === 0),
    // all while staying well under the 30/min cap.
    let expectedTouches = 2;
    for (let i = 0; i < MAX_BUCKETS + 500; i++) {
      if (i % 2000 === 0) expectedTouches++;
    }
    expect(bucket!.windowStart).toBe(t0);
    expect(bucket!.count).toBe(expectedTouches);
  });

  it("still enforces the 30 writes/min cap for a normal user", () => {
    const userId = "normal-user";
    const t0 = Date.now();

    for (let i = 0; i < 30; i++) {
      checkWriteRateLimit(userId, t0 + i);
    }

    expect(() => checkWriteRateLimit(userId, t0 + 31)).toThrow(
      "Too many requests. Try again in a minute.",
    );
  });
});
