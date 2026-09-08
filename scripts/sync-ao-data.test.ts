import { describe, expect, it } from "vitest";
import { computeMaxEnchant, humanizeSpellName, resolveSpellLocalizedNames } from "./sync-ao-data";

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

describe("resolveSpellLocalizedNames", () => {
  it("resolves an exact TMX match", () => {
    const index = new Map([["PASSIVE_FOO", { "EN-US": "Foo" }]]);
    expect(resolveSpellLocalizedNames("PASSIVE_FOO", index)).toEqual({ "EN-US": "Foo" });
  });

  it("resolves PASSIVE_ARMORCHANCE_SWORD via the weapon-agnostic base spell (ACM-079)", () => {
    // Regression: upstream localization.json has no @SPELLS_PASSIVE_ARMORCHANCE_SWORD
    // entry — only the weapon-agnostic @SPELLS_PASSIVE_ARMORCHANCE one.
    const index = new Map([
      ["PASSIVE_ARMORCHANCE", { "EN-US": "Increased Defense", "PT-BR": "Defesa Aumentada" }],
    ]);
    expect(resolveSpellLocalizedNames("PASSIVE_ARMORCHANCE_SWORD", index)).toEqual({
      "EN-US": "Increased Defense",
      "PT-BR": "Defesa Aumentada",
    });
  });

  it("resolves a tiered passive localized only at a lower tier (e.g. T4) for a higher tier (e.g. T5)", () => {
    const index = new Map([["PASSIVE_BACKPACK_FIBER_T4", { "EN-US": "Fiber Carrier" }]]);
    expect(resolveSpellLocalizedNames("PASSIVE_BACKPACK_FIBER_T5", index)).toEqual({
      "EN-US": "Fiber Carrier",
    });
  });

  it("returns undefined when no strategy finds a match", () => {
    const index = new Map<string, Record<string, string>>();
    expect(resolveSpellLocalizedNames("PYROBLAST_SKILLSHOT", index)).toBeUndefined();
  });
});

describe("humanizeSpellName", () => {
  it("strips a known prefix and title-cases the remaining words as a last-resort fallback", () => {
    expect(humanizeSpellName("PYROBLAST_SKILLSHOT")).toBe("Pyroblast Skillshot");
  });

  it("strips PASSIVE_ prefix before humanizing", () => {
    expect(humanizeSpellName("PASSIVE_MAXLOAD_OWL")).toBe("Maxload Owl");
  });
});
