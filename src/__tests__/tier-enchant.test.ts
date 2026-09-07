import { describe, expect, it } from "vitest";
import type { AOItem } from "@/data/ao-data.d";
import corpus from "./fixtures/ao-corpus.json";
import { getEnchantOptions, getTierVariants, parseUniquename } from "@/components/editor/tier-enchant";

function item(uniquename: string): AOItem {
  return {
    uniquename,
    slot: "mainhand",
    localizedNames: {},
    spells: [],
    twohanded: false,
    maxEnchant: 0,
  };
}

const CATALOG: AOItem[] = [
  item("T4_HEAD_PLATE_SET1"),
  item("T5_HEAD_PLATE_SET1"),
  item("T6_HEAD_PLATE_SET1"),
  item("T7_HEAD_PLATE_SET1"),
  item("T8_HEAD_PLATE_SET1"),
  item("T4_MAIN_SWORD"),
  item("T5_MAIN_SWORD"),
  // unrelated base — must never leak into HEAD_PLATE_SET1 results.
  item("T4_HEAD_PLATE_SET2"),
];

describe("parseUniquename", () => {
  it("splits tier prefix and base", () => {
    expect(parseUniquename("T8_HEAD_PLATE_SET1")).toEqual({ tier: 8, base: "HEAD_PLATE_SET1" });
  });

  it("returns tier 0 for a non-tiered id", () => {
    expect(parseUniquename("UNIQUE_VANITY_SKULL")).toEqual({ tier: 0, base: "UNIQUE_VANITY_SKULL" });
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

  it("only lists tiers that actually exist in the catalogue for this base", () => {
    const options = getTierVariants(CATALOG, "T4_MAIN_SWORD");
    expect(options.map((o) => o.tier)).toEqual([4, 5]);
  });
});

describe("getEnchantOptions (ACM-031 AC#1, decision-011)", () => {
  const items = corpus.items as Array<Pick<AOItem, "uniquename" | "maxEnchant">>;

  it("derives 0..maxEnchant from a real fixture item with maxEnchant 4", () => {
    const item = items.find((i) => i.uniquename === "T4_HEAD_PLATE_SET1");
    expect(item?.maxEnchant).toBe(4);
    expect(getEnchantOptions(item!)).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns only [0] for a real fixture item with maxEnchant 0", () => {
    const item = items.find((i) => i.maxEnchant === 0);
    expect(item).toBeDefined();
    expect(getEnchantOptions(item!)).toEqual([0]);
  });

  it("never derives options from the uniquename (no @N parsing)", () => {
    // A fabricated "@1" suffix must have zero influence: only maxEnchant matters.
    const item = { uniquename: "T8_HEAD_PLATE_SET1@1", maxEnchant: 2 };
    expect(getEnchantOptions(item)).toEqual([0, 1, 2]);
  });
});
