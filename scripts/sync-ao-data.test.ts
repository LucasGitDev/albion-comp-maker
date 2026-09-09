import { describe, expect, it } from "vitest";
import {
  computeMaxEnchant,
  humanizeSpellName,
  isEmittedConsumable,
  isReleasedItem,
  resolveSpellLocalizedNames,
} from "./sync-ao-data";

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

describe("isEmittedConsumable", () => {
  it("emits food (T4_MEAL_OMELETTE: consumables/food)", () => {
    expect(isEmittedConsumable({ "@shopcategory": "consumables", "@shopsubcategory1": "food" })).toBe(true);
  });

  it("emits potions (T4_POTION_HEAL: consumables/potions)", () => {
    expect(isEmittedConsumable({ "@shopcategory": "consumables", "@shopsubcategory1": "potions" })).toBe(true);
  });

  it("excludes raw fish (T4_FISH_FRESHWATER_ALL_COMMON: crafting/fish)", () => {
    expect(isEmittedConsumable({ "@shopcategory": "crafting", "@shopsubcategory1": "fish" })).toBe(false);
  });

  it("excludes vanity fireworks (T3_VANITY_CONSUMABLE_FIREWORKS_BLUE: consumables/other)", () => {
    expect(isEmittedConsumable({ "@shopcategory": "consumables", "@shopsubcategory1": "other" })).toBe(false);
  });
});

describe("isReleasedItem", () => {
  it("excludes an item localized only in EN-US (T8_HEAD_PLATE_PROTOTYPE shape, decision-024)", () => {
    expect(
      isReleasedItem({ LocalizedNames: { "EN-US": "Dragonknight Helmet" } }),
    ).toBe(false);
  });

  it("includes a fully localized item (T8_HEAD_PLATE_SET3 shape)", () => {
    expect(
      isReleasedItem({
        LocalizedNames: {
          "EN-US": "Soldier Helmet",
          "PT-BR": "Capacete de Soldado",
          "DE-DE": "Soldatenhelm",
        },
      }),
    ).toBe(true);
  });

  it("includes an item with exactly 2 locales (threshold)", () => {
    expect(
      isReleasedItem({ LocalizedNames: { "EN-US": "Foo", "PT-BR": "Bar" } }),
    ).toBe(true);
  });

  it("excludes missing, null, or empty LocalizedNames", () => {
    expect(isReleasedItem({})).toBe(false);
    expect(isReleasedItem({ LocalizedNames: null })).toBe(false);
    expect(isReleasedItem({ LocalizedNames: {} })).toBe(false);
  });

  it("does not exclude a fully localized item whose uniquename contains PROTOTYPE (AC-2: not a substring rule)", () => {
    // Regression: proves the predicate is about localization coverage, not
    // uniquename pattern matching — a legitimately released item that happens
    // to have "PROTOTYPE" in its name (hypothetical) must still pass.
    expect(
      isReleasedItem({
        LocalizedNames: {
          "EN-US": "Prototype Blade",
          "PT-BR": "Lamina Prototipo",
          "DE-DE": "Prototyp-Klinge",
        },
      }),
    ).toBe(true);
  });

  it("includes a vanity item with 15 locales despite no description (proves we didn't land on rejected option B)", () => {
    const fifteenLocales: Record<string, string> = {};
    for (let i = 0; i < 15; i++) fifteenLocales[`LOCALE-${i}`] = "Vanity Knight Helmet";
    expect(isReleasedItem({ LocalizedNames: fifteenLocales })).toBe(true);
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
