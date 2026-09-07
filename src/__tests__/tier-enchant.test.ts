import { describe, expect, it } from "vitest";
import type { AOItem } from "@/data/ao-data.d";
import { getEnchantOptions, getTierVariants, parseUniquename } from "@/components/editor/tier-enchant";

function item(uniquename: string): AOItem {
  return {
    uniquename,
    slot: "mainhand",
    localizedNames: {},
    spells: [],
    twohanded: false,
  };
}

const CATALOG: AOItem[] = [
  item("T4_HEAD_PLATE_SET1"),
  item("T5_HEAD_PLATE_SET1"),
  item("T6_HEAD_PLATE_SET1"),
  item("T7_HEAD_PLATE_SET1"),
  item("T8_HEAD_PLATE_SET1"),
  item("T8_HEAD_PLATE_SET1@1"),
  item("T8_HEAD_PLATE_SET1@2"),
  item("T8_HEAD_PLATE_SET1@3"),
  item("T4_MAIN_SWORD"),
  item("T5_MAIN_SWORD"),
  // unrelated base — must never leak into HEAD_PLATE_SET1 results.
  item("T4_HEAD_PLATE_SET2"),
];

describe("parseUniquename", () => {
  it("splits tier prefix, base, and enchant suffix", () => {
    expect(parseUniquename("T8_HEAD_PLATE_SET1@2")).toEqual({ tier: 8, base: "HEAD_PLATE_SET1", enchant: 2 });
  });

  it("defaults enchant to 0 when absent", () => {
    expect(parseUniquename("T4_HEAD_PLATE_SET1")).toEqual({ tier: 4, base: "HEAD_PLATE_SET1", enchant: 0 });
  });

  it("returns tier 0 for a non-tiered id", () => {
    expect(parseUniquename("UNIQUE_VANITY_SKULL")).toEqual({ tier: 0, base: "UNIQUE_VANITY_SKULL", enchant: 0 });
  });
});

describe("getTierVariants (AC #1)", () => {
  it("derives every tier sharing the same base id, sorted ascending", () => {
    const options = getTierVariants(CATALOG, "T6_HEAD_PLATE_SET1");
    expect(options.map((o) => o.tier)).toEqual([4, 5, 6, 7, 8]);
    expect(options.map((o) => o.itemId)).toEqual([
      "T4_HEAD_PLATE_SET1",
      "T5_HEAD_PLATE_SET1",
      "T6_HEAD_PLATE_SET1",
      "T7_HEAD_PLATE_SET1",
      "T8_HEAD_PLATE_SET1",
    ]);
  });

  it("never includes items from a different base id", () => {
    const options = getTierVariants(CATALOG, "T4_HEAD_PLATE_SET1");
    expect(options.some((o) => o.itemId.includes("SET2"))).toBe(false);
  });

  it("prefers the sibling at the current enchant level, falling back to enchant 0", () => {
    // Current is T8@2; only T8 has an enchant-2 variant, other tiers fall back to enchant 0.
    const options = getTierVariants(CATALOG, "T8_HEAD_PLATE_SET1@2");
    const t8 = options.find((o) => o.tier === 8);
    const t4 = options.find((o) => o.tier === 4);
    expect(t8?.itemId).toBe("T8_HEAD_PLATE_SET1@2");
    expect(t4?.itemId).toBe("T4_HEAD_PLATE_SET1");
  });
});

describe("getEnchantOptions (AC #2)", () => {
  it("only lists enchants that actually exist for this base+tier in the catalogue", () => {
    const options = getEnchantOptions(CATALOG, "T8_HEAD_PLATE_SET1");
    expect(options.map((o) => o.enchant)).toEqual([0, 1, 2, 3]);
  });

  it("never offers an enchant above the catalogue's max for this item", () => {
    const options = getEnchantOptions(CATALOG, "T4_MAIN_SWORD");
    // T4_MAIN_SWORD has no @n siblings in the fixture.
    expect(options.map((o) => o.enchant)).toEqual([0]);
  });

  it("does not mix enchant options across different tiers of the same base", () => {
    const options = getEnchantOptions(CATALOG, "T4_HEAD_PLATE_SET1");
    expect(options).toEqual([{ enchant: 0, itemId: "T4_HEAD_PLATE_SET1" }]);
  });
});
