import { describe, expect, it } from "vitest";

import { parseBuildContent, validateBuildContentForWrite } from "@/lib/build-schema";

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

describe("build-schema (ACM-049 / decision-013)", () => {
  describe("validateBuildContentForWrite (strict write path)", () => {
    it("accepts a valid build and re-serializes it", () => {
      const raw = JSON.stringify(validBuild());
      const result = validateBuildContentForWrite(raw);
      expect(JSON.parse(result)).toEqual(validBuild());
    });

    it("rejects a payload over the 128 KiB cap before attempting JSON.parse", () => {
      const huge = "x".repeat(131072 + 1);
      expect(() => validateBuildContentForWrite(huge)).toThrow(/128|131072|limit/i);
    });

    it("rejects invalid JSON", () => {
      expect(() => validateBuildContentForWrite("{not json")).toThrow();
    });

    it("rejects an invalid shape (missing required fields)", () => {
      expect(() => validateBuildContentForWrite(JSON.stringify({ name: "x" }))).toThrow();
    });

    it("rejects unknown top-level fields instead of silently stripping them", () => {
      const raw = JSON.stringify(validBuild({ evil: "<script>" }));
      expect(() => validateBuildContentForWrite(raw)).toThrow();
    });

    it("rejects a non-hex-literal accent (CSS injection vector)", () => {
      const raw = JSON.stringify(validBuild({ accent: "red; background: url(javascript:alert(1))" }));
      expect(() => validateBuildContentForWrite(raw)).toThrow();
    });

    it("rejects an equipped item with an unknown field", () => {
      const raw = JSON.stringify(
        validBuild({
          slots: {
            mainhand: {
              itemId: "T8_2H_INFERNOSTAFF_MORGANA@4",
              tier: 8,
              enchant: 4,
              spells: { q: null, w: null, e: null, passive: null },
              twohanded: true,
              extra: "nope",
            },
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
        }),
      );
      expect(() => validateBuildContentForWrite(raw)).toThrow();
    });

    it("rejects more than 20 swaps", () => {
      const swap = {
        id: "swap-1",
        label: "Swap",
        slots: {},
      };
      const raw = JSON.stringify(validBuild({ swaps: Array.from({ length: 21 }, () => swap) }));
      expect(() => validateBuildContentForWrite(raw)).toThrow();
    });
  });

  describe("parseBuildContent (tolerant read path)", () => {
    it("returns ok:true for a valid payload", () => {
      const result = parseBuildContent(JSON.stringify(validBuild()));
      expect(result).toEqual({ ok: true, data: validBuild() });
    });

    it("returns ok:false reason:too-large for an oversized payload, without throwing", () => {
      const huge = "x".repeat(131072 + 1);
      expect(parseBuildContent(huge)).toEqual({ ok: false, reason: "too-large" });
    });

    it("returns ok:false reason:invalid-json for malformed JSON, without throwing", () => {
      expect(parseBuildContent("{not json")).toEqual({ ok: false, reason: "invalid-json" });
    });

    it("tolerates a legacy row that never passed any schema (e.g. '{}') without throwing", () => {
      const result = parseBuildContent("{}");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("invalid-shape");
      }
    });

    it("tolerates an arbitrary legacy shape without throwing", () => {
      expect(() => parseBuildContent(JSON.stringify({ some: "old", shape: 1 }))).not.toThrow();
    });
  });
});
