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
              maxEnchant: 4,
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

    it("ACM-031 review fix: accepts an equipped item carrying maxEnchant (schema stayed in sync with EquippedItem)", () => {
      const raw = JSON.stringify(
        validBuild({
          slots: {
            mainhand: {
              itemId: "T4_HEAD_PLATE_SET1",
              tier: 4,
              enchant: 3,
              spells: { q: null, w: null, e: null, passive: null },
              twohanded: false,
              maxEnchant: 4,
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
      const result = validateBuildContentForWrite(raw);
      expect(JSON.parse(result).slots.mainhand).toMatchObject({ enchant: 3, maxEnchant: 4 });
    });

    it("rejects an equipped item missing maxEnchant (schema requires it, matching EquippedItem)", () => {
      const raw = JSON.stringify(
        validBuild({
          slots: {
            mainhand: {
              itemId: "T4_HEAD_PLATE_SET1",
              tier: 4,
              enchant: 0,
              spells: { q: null, w: null, e: null, passive: null },
              twohanded: false,
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

    it("accepts a swap with an empty label (ACM-012 review round 3: a swap must be saveable before the leader ever touches the label field)", () => {
      const swap = { id: "swap-1", label: "", slots: {} };
      const raw = JSON.stringify(validBuild({ swaps: [swap] }));
      const result = validateBuildContentForWrite(raw);
      expect(JSON.parse(result).swaps).toEqual([swap]);
    });

    it("still enforces the 60-char max on a swap label", () => {
      const swap = { id: "swap-1", label: "x".repeat(61), slots: {} };
      const raw = JSON.stringify(validBuild({ swaps: [swap] }));
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

    it("returns ok:true for a swap with an empty label", () => {
      const swap = { id: "swap-1", label: "", slots: {} };
      const result = parseBuildContent(JSON.stringify(validBuild({ swaps: [swap] })));
      expect(result).toEqual({ ok: true, data: validBuild({ swaps: [swap] }) });
    });

    it("still parses a legacy payload whose swap label is non-empty (regression safety: relaxing min(1) to allow '' must not break existing persisted labels)", () => {
      const swap = { id: "swap-1", label: "Split push", slots: {} };
      const result = parseBuildContent(JSON.stringify(validBuild({ swaps: [swap] })));
      expect(result).toEqual({ ok: true, data: validBuild({ swaps: [swap] }) });
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

    it("ACM-031 review fix: accepts a pre-ACM-031 equipped item with NO maxEnchant key and backfills it to the domain max (4), preserving the legacy enchant value", () => {
      const raw = JSON.stringify(
        validBuild({
          slots: {
            mainhand: {
              itemId: "T4_HEAD_PLATE_SET1",
              tier: 4,
              enchant: 3,
              spells: { q: null, w: null, e: null, passive: null },
              twohanded: false,
              // no maxEnchant key at all — this is the exact pre-ACM-031 shape
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

      const result = parseBuildContent(raw);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.slots.mainhand).toMatchObject({ enchant: 3, maxEnchant: 4 });
      }
    });

    it("re-validating a backfilled legacy read through the strict write schema succeeds (duplicateBuild/forkBuild path)", () => {
      const raw = JSON.stringify(
        validBuild({
          slots: {
            mainhand: {
              itemId: "T4_HEAD_PLATE_SET1",
              tier: 4,
              enchant: 2,
              spells: { q: null, w: null, e: null, passive: null },
              twohanded: false,
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

      const read = parseBuildContent(raw);
      expect(read.ok).toBe(true);
      if (!read.ok) return;

      const rewritten = validateBuildContentForWrite(JSON.stringify(read.data));
      expect(JSON.parse(rewritten).slots.mainhand).toMatchObject({ enchant: 2, maxEnchant: 4 });
    });
  });
});
