import { describe, expect, it } from "vitest";
import { computeMaxEnchant } from "./sync-ao-data";

describe("computeMaxEnchant", () => {
  it("returns 0 when the enchantments key is absent (e.g. a mount)", () => {
    expect(computeMaxEnchant({})).toBe(0);
  });

  it("counts enchantment entries when enchantments.enchantment is an array (T4_HEAD_PLATE_SET1 shape)", () => {
    const item = {
      enchantments: {
        enchantment: [
          { "@enchantmentlevel": "1" },
          { "@enchantmentlevel": "2" },
          { "@enchantmentlevel": "3" },
          { "@enchantmentlevel": "4" },
        ],
      },
    };
    expect(computeMaxEnchant(item)).toBe(4);
  });

  it("normalizes a single-child enchantment object (XML->JSON collapse quirk) to 1", () => {
    const item = {
      enchantments: {
        enchantment: { "@enchantmentlevel": "1" },
      },
    };
    expect(computeMaxEnchant(item)).toBe(1);
  });
});
