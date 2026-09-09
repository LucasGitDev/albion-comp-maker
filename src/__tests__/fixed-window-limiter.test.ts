import { describe, expect, it } from "vitest";
import { createFixedWindowLimiter } from "@/lib/fixed-window-limiter";

describe("createFixedWindowLimiter", () => {
  it("allows up to max requests per window then blocks", () => {
    const limiter = createFixedWindowLimiter({
      windowMs: 1000,
      max: 2,
      maxBuckets: 10,
      sweepIntervalMs: 100,
    });
    const t0 = 0;

    expect(limiter.check("a", t0)).toBe(true);
    expect(limiter.check("a", t0 + 1)).toBe(true);
    expect(limiter.check("a", t0 + 2)).toBe(false);
  });

  it("resets a bucket once its window elapses", () => {
    const limiter = createFixedWindowLimiter({
      windowMs: 1000,
      max: 1,
      maxBuckets: 10,
      sweepIntervalMs: 100,
    });

    expect(limiter.check("a", 0)).toBe(true);
    expect(limiter.check("a", 500)).toBe(false);
    expect(limiter.check("a", 1500)).toBe(true);
  });

  it("sweeps expired buckets once the sweep interval has elapsed", () => {
    // `lastSweep` inside the limiter is seeded from the real `Date.now()`,
    // not from the `now` argument, so these timestamps must be anchored to
    // real wall-clock time rather than small fake values.
    const t0 = Date.now();
    const limiter = createFixedWindowLimiter({
      windowMs: 100,
      max: 1,
      maxBuckets: 10,
      sweepIntervalMs: 50,
    });

    limiter.check("a", t0);
    expect(limiter.peek("a")).toBeDefined();

    // Window (100ms) has expired, and enough time has passed since the last
    // sweep (>= sweepIntervalMs) that the next `check` call triggers the
    // sweep branch, dropping the expired bucket for "a" before touching "b".
    limiter.check("b", t0 + 200);
    expect(limiter.peek("a")).toBeUndefined();
  });

  it("does not sweep before the sweep interval has elapsed", () => {
    const t0 = Date.now();
    const limiter = createFixedWindowLimiter({
      windowMs: 10,
      max: 1,
      maxBuckets: 10,
      sweepIntervalMs: 1000,
    });

    limiter.check("a", t0);
    // Window for "a" is already expired, but the sweep interval has not —
    // the bucket should survive until the next eligible sweep.
    limiter.check("b", t0 + 20);
    expect(limiter.peek("a")).toBeDefined();
  });

  it("evicts expired buckets first when over capacity", () => {
    const limiter = createFixedWindowLimiter({
      windowMs: 10,
      max: 5,
      maxBuckets: 2,
      sweepIntervalMs: 1_000_000,
    });

    limiter.check("expired", 0);
    // Sweep interval never elapses, so "expired" is only cleaned up by the
    // capacity-eviction path's own expired-window sweep (line 67-70).
    limiter.check("fresh-1", 100);
    limiter.check("fresh-2", 101);

    expect(limiter.peek("expired")).toBeUndefined();
    expect(limiter.peek("fresh-1")).toBeDefined();
    expect(limiter.peek("fresh-2")).toBeDefined();
  });

  it("falls back to evicting the least-recently-used bucket when still over capacity after sweeping", () => {
    const limiter = createFixedWindowLimiter({
      windowMs: 1_000_000,
      max: 5,
      maxBuckets: 2,
      sweepIntervalMs: 1_000_000,
    });

    limiter.check("a", 0);
    limiter.check("b", 1);
    // Neither "a" nor "b" has expired, so capacity eviction must fall back
    // to dropping the least-recently-used bucket ("a").
    limiter.check("c", 2);

    expect(limiter.peek("a")).toBeUndefined();
    expect(limiter.peek("b")).toBeDefined();
    expect(limiter.peek("c")).toBeDefined();
  });

  it("reset() clears all bucket state", () => {
    const limiter = createFixedWindowLimiter({
      windowMs: 1000,
      max: 1,
      maxBuckets: 10,
      sweepIntervalMs: 100,
    });

    limiter.check("a", 0);
    limiter.reset();
    expect(limiter.peek("a")).toBeUndefined();
    expect(limiter.check("a", 0)).toBe(true);
  });
});
