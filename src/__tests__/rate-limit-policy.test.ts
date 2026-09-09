import { describe, expect, it } from "vitest";
import { RATE_LIMIT_POLICY, createSurfaceLimiter, UNTRUSTED_KEY } from "@/lib/rate-limit-policy";

describe("rate-limit-policy", () => {
  it("never lets the untrusted budget exceed the per-IP budget for any declared surface (ACM-084 AC#1, AC#4)", () => {
    for (const [surface, policy] of Object.entries(RATE_LIMIT_POLICY)) {
      expect(policy.untrustedMax, `${surface} untrustedMax must be <= perIpMax`).toBeLessThanOrEqual(
        policy.perIpMax,
      );
    }
  });

  it("enforces the declared untrustedMax for every surface at runtime", () => {
    for (const surface of Object.keys(RATE_LIMIT_POLICY) as Array<keyof typeof RATE_LIMIT_POLICY>) {
      const limiter = createSurfaceLimiter(surface);
      const policy = RATE_LIMIT_POLICY[surface];
      const t0 = Date.now();

      for (let i = 0; i < policy.untrustedMax; i++) {
        expect(limiter.check(UNTRUSTED_KEY, t0 + i)).toBe(true);
      }
      expect(limiter.check(UNTRUSTED_KEY, t0 + policy.untrustedMax)).toBe(false);
    }
  });

  it("keeps per-surface untrusted buckets independent (icon exhaustion does not affect items)", () => {
    const items = createSurfaceLimiter("items");
    const icon = createSurfaceLimiter("icon");
    const t0 = Date.now();

    for (let i = 0; i < RATE_LIMIT_POLICY.items.untrustedMax; i++) {
      items.check(UNTRUSTED_KEY, t0 + i);
    }
    expect(items.check(UNTRUSTED_KEY, t0 + RATE_LIMIT_POLICY.items.untrustedMax)).toBe(false);
    expect(icon.check(UNTRUSTED_KEY, t0 + RATE_LIMIT_POLICY.items.untrustedMax)).toBe(true);
  });
});
