import { describe, expect, it } from "vitest";

import { validateBuildContentForWrite } from "@/lib/build-schema";
import { compBuildLabelSchema, compNameSchema } from "@/lib/comp-schema";
import {
  ACCENT_HEX_PATTERN,
  BUILD_NAME_MAX_LENGTH,
  BUILD_ROLE_MAX_LENGTH,
  COMP_BUILD_LABEL_MAX_LENGTH,
  COMP_NAME_MAX_LENGTH,
  MAX_SWAPS,
  SWAP_LABEL_MAX_LENGTH,
} from "@/lib/validation-constants";
import { resolveAccent } from "@/components/build-card/tokens";
import { MAX_SWAPS as storeMaxSwaps, useBuildStore } from "@/store/build-store";

/**
 * ACM-059: `src/lib/validation-constants.ts` is the single source of truth
 * for limits shared between the server-only schemas (`build-schema.ts`,
 * `comp-schema.ts`) and client code (`build-store.ts`, form `maxLength`s).
 *
 * These tests exercise the *actual enforced behavior* of the server-only
 * schemas at the `validation-constants` boundary values, so a future
 * literal reintroduced in a schema (instead of the shared constant) makes
 * this test fail rather than silently drifting — the exact bug this task
 * fixes (ACM-049/ACM-054/ACM-056).
 */

function validBuild(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    name: "Fire Staff",
    role: "dps",
    accent: "#3f8f4a",
    slots: {
      mainhand: null,
      offhand: null,
      head: null,
      armor: null,
      shoes: null,
      cape: null,
      bag: null,
      mount: null,
      food: null,
      potion: null,
    },
    swaps: [],
    ...overrides,
  };
}

function swapWithLabelLength(length: number) {
  return {
    id: "swap-1",
    label: "x".repeat(length),
    slots: { mainhand: null },
  };
}

describe("validation-constants (ACM-059 anti-drift)", () => {
  it("build-store's MAX_SWAPS is re-exported from validation-constants, not a local copy", () => {
    expect(useBuildStore).toBeDefined();
    expect(storeMaxSwaps).toBe(MAX_SWAPS);
  });

  it("buildStateSchema accepts exactly MAX_SWAPS swaps and rejects one more", () => {
    const okSwaps = Array.from({ length: MAX_SWAPS }, (_, i) => ({
      id: `swap-${i}`,
      label: "",
      slots: { mainhand: null },
    }));
    expect(() =>
      validateBuildContentForWrite(JSON.stringify(validBuild({ swaps: okSwaps })))
    ).not.toThrow();

    const tooManySwaps = [...okSwaps, { id: "swap-extra", label: "", slots: { mainhand: null } }];
    expect(() =>
      validateBuildContentForWrite(JSON.stringify(validBuild({ swaps: tooManySwaps })))
    ).toThrow();
  });

  it("buildStateSchema enforces BUILD_NAME_MAX_LENGTH", () => {
    const okName = "n".repeat(BUILD_NAME_MAX_LENGTH);
    const tooLong = "n".repeat(BUILD_NAME_MAX_LENGTH + 1);
    expect(() =>
      validateBuildContentForWrite(JSON.stringify(validBuild({ name: okName })))
    ).not.toThrow();
    expect(() =>
      validateBuildContentForWrite(JSON.stringify(validBuild({ name: tooLong })))
    ).toThrow();
  });

  it("buildStateSchema enforces BUILD_ROLE_MAX_LENGTH", () => {
    const okRole = "r".repeat(BUILD_ROLE_MAX_LENGTH);
    const tooLong = "r".repeat(BUILD_ROLE_MAX_LENGTH + 1);
    expect(() =>
      validateBuildContentForWrite(JSON.stringify(validBuild({ role: okRole })))
    ).not.toThrow();
    expect(() =>
      validateBuildContentForWrite(JSON.stringify(validBuild({ role: tooLong })))
    ).toThrow();
  });

  it("buildStateSchema enforces SWAP_LABEL_MAX_LENGTH", () => {
    const ok = swapWithLabelLength(SWAP_LABEL_MAX_LENGTH);
    const tooLong = swapWithLabelLength(SWAP_LABEL_MAX_LENGTH + 1);
    expect(() =>
      validateBuildContentForWrite(JSON.stringify(validBuild({ swaps: [ok] })))
    ).not.toThrow();
    expect(() =>
      validateBuildContentForWrite(JSON.stringify(validBuild({ swaps: [tooLong] })))
    ).toThrow();
  });

  it("buildStateSchema's accent pattern matches ACCENT_HEX_PATTERN", () => {
    expect(() =>
      validateBuildContentForWrite(JSON.stringify(validBuild({ accent: "#abcdef" })))
    ).not.toThrow();
    expect(ACCENT_HEX_PATTERN.test("#abcdef")).toBe(true);

    expect(() =>
      validateBuildContentForWrite(JSON.stringify(validBuild({ accent: "#abc" })))
    ).toThrow();
    expect(ACCENT_HEX_PATTERN.test("#abc")).toBe(false);
  });

  it("ACM-054: write and render accent patterns come from the same single module constant", () => {
    const validPersistedAccents = ["#abcdef", "#000000", "#FFFFFF", "#4a8fd4"];
    for (const accent of validPersistedAccents) {
      // Every accent that can pass the write-side schema must also be
      // accepted verbatim by resolveAccent() — both share ACCENT_HEX_PATTERN.
      expect(() =>
        validateBuildContentForWrite(JSON.stringify(validBuild({ accent })))
      ).not.toThrow();
      expect(ACCENT_HEX_PATTERN.test(accent)).toBe(true);
      expect(resolveAccent("dps", accent)).toBe(accent);
    }

    // Shorthand hex is rejected on both sides — no production path ever
    // generates a 3/4/8-digit accent, so there is a single strict pattern.
    expect(ACCENT_HEX_PATTERN.test("#abc")).toBe(false);
    expect(resolveAccent("dps", "#abc")).not.toBe("#abc");
  });

  it("compNameSchema enforces COMP_NAME_MAX_LENGTH", () => {
    const ok = "n".repeat(COMP_NAME_MAX_LENGTH);
    const tooLong = "n".repeat(COMP_NAME_MAX_LENGTH + 1);
    expect(compNameSchema.safeParse(ok).success).toBe(true);
    expect(compNameSchema.safeParse(tooLong).success).toBe(false);
  });

  it("compBuildLabelSchema enforces COMP_BUILD_LABEL_MAX_LENGTH", () => {
    const ok = "n".repeat(COMP_BUILD_LABEL_MAX_LENGTH);
    const tooLong = "n".repeat(COMP_BUILD_LABEL_MAX_LENGTH + 1);
    expect(compBuildLabelSchema.safeParse(ok).success).toBe(true);
    expect(compBuildLabelSchema.safeParse(tooLong).success).toBe(false);
  });
});
