import { describe, it, expect } from "vitest";
import {
  buildItemIndex,
  enumerateItemCategories,
  resolveSpells,
  safeKeyedRecord,
  type RawItem,
  type SpellKind,
} from "../lib/spell-resolver";

// --- fixture helpers ---

/**
 * Fixture shaped like the real repo-root items.json: { items: { <category>: [...] } }.
 * References in craftingspelllist can cross categories, so buildItemIndex
 * must flatten every array-valued key under `items`, not just one category.
 */
function makeRawItems(categories: Record<string, RawItem[]>) {
  return { items: categories };
}

function kinds(map: Record<string, SpellKind>): Map<string, SpellKind> {
  return new Map(Object.entries(map));
}

describe("buildItemIndex", () => {
  it("indexes items across multiple category keys into one flat map", () => {
    const raw = makeRawItems({
      weapon: [{ "@uniquename": "T4_MAIN_SWORD" }],
      equipmentitem: [{ "@uniquename": "T4_HEAD_PLATE_SET1" }],
      mount: [{ "@uniquename": "T3_MOUNT_HORSE" }],
    });
    const index = buildItemIndex(raw);
    expect(index.size).toBe(3);
    expect(index.has("T4_MAIN_SWORD")).toBe(true);
    expect(index.has("T4_HEAD_PLATE_SET1")).toBe(true);
    expect(index.has("T3_MOUNT_HORSE")).toBe(true);
  });

  it("skips non-array keys like @xmlns:xsi and shopcategories", () => {
    const raw = {
      items: {
        "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        "@xsi:noNamespaceSchemaLocation": "items.xsd",
        shopcategories: { shopcategory: [{ "@uniquename": "NOT_AN_ITEM" }] },
        weapon: [{ "@uniquename": "T4_MAIN_SWORD" }],
      },
    };
    const index = buildItemIndex(raw);
    expect(index.size).toBe(1);
    expect(index.has("T4_MAIN_SWORD")).toBe(true);
    expect(index.has("NOT_AN_ITEM")).toBe(false);
  });

  it("supports a flat top-level array (legacy/simple fixtures)", () => {
    const index = buildItemIndex([{ "@uniquename": "SIMPLE" }]);
    expect(index.size).toBe(1);
  });

  it("normalizes a category collapsed to a bare object (xml2json single-element quirk) instead of dropping it", () => {
    const raw = {
      items: {
        // xml2json collapses a single-child array to a bare object — this
        // category must still be indexed, not silently skipped.
        mount: { "@uniquename": "T3_MOUNT_HORSE" },
        weapon: [{ "@uniquename": "T4_MAIN_SWORD" }],
      },
    };
    const index = buildItemIndex(raw);
    expect(index.size).toBe(2);
    expect(index.has("T3_MOUNT_HORSE")).toBe(true);
  });
});

describe("enumerateItemCategories", () => {
  it("still excludes NON_CATEGORY_KEYS when a category is a bare object", () => {
    const raw = {
      items: {
        "@xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
        shopcategories: { shopcategory: { "@uniquename": "NOT_AN_ITEM" } },
        mount: { "@uniquename": "T3_MOUNT_HORSE" },
      },
    };
    const categories = enumerateItemCategories(raw);
    const categoryNames = categories.map(([name]) => name);
    expect(categoryNames).toContain("mount");
    expect(categoryNames).not.toContain("shopcategories");
    expect(categoryNames).not.toContain("@xmlns:xsi");
  });

  it("returns a single 'items' category for a flat top-level array", () => {
    const categories = enumerateItemCategories([{ "@uniquename": "SIMPLE" }]);
    expect(categories).toEqual([["items", [{ "@uniquename": "SIMPLE" }]]]);
  });
});

describe("safeKeyedRecord", () => {
  it("stores a '__proto__'-named key as an own property instead of rewriting the prototype", () => {
    const record = safeKeyedRecord<{ kind: string }>([
      ["__proto__", { kind: "passive" }],
      ["NORMAL_SPELL", { kind: "active" }],
    ]);

    expect(Object.getPrototypeOf(record)).toBe(null);
    expect(Object.prototype.hasOwnProperty.call(record, "__proto__")).toBe(true);
    expect(record["__proto__"]).toEqual({ kind: "passive" });
    expect(record["NORMAL_SPELL"]).toEqual({ kind: "active" });
    // A dangerous pollution would make this an object rather than "passive".
    expect(({} as { kind?: unknown }).kind).toBeUndefined();

    // Serializes with both entries present, just like a plain object would.
    const parsedKeys = Object.keys(JSON.parse(JSON.stringify(record)));
    expect(parsedKeys).toContain("NORMAL_SPELL");
    expect(parsedKeys).toContain("__proto__");
  });
});

describe("resolveSpells", () => {
  it("resolves craftspell entries via craftingspelllist and respects removespell", () => {
    const raw = makeRawItems({
      weapon: [
        {
          "@uniquename": "T8_BASE_HAMMER",
          craftingspelllist: {
            craftspell: [
              { "@uniquename": "BASE_SPELL_1", "@slots": "1" },
              { "@uniquename": "BASE_SPELL_2", "@slots": "2" },
            ],
          },
        },
        {
          "@uniquename": "T8_2H_HAMMER_UNDEAD",
          craftingspelllist: {
            "@reference": "T8_BASE_HAMMER",
            craftspell: [{ "@uniquename": "ARTIFACT_SPELL", "@slots": "3" }],
            removespell: [{ "@uniquename": "BASE_SPELL_2" }],
          },
        },
      ],
    });
    const index = buildItemIndex(raw);
    const spells = resolveSpells("T8_2H_HAMMER_UNDEAD", index, kinds({}));

    const names = spells.map((s) => s.uniquename);
    expect(names).toContain("ARTIFACT_SPELL");
    expect(names).toContain("BASE_SPELL_1");
    expect(names).not.toContain("BASE_SPELL_2"); // removed
  });

  it("defaults slot to '1' when @slots is absent (majority of craftspell entries)", () => {
    const raw = makeRawItems({
      weapon: [
        {
          "@uniquename": "T4_MAIN_FIRESTAFF",
          craftingspelllist: {
            craftspell: [
              { "@uniquename": "FIRE_MAGIC_MISSILE" }, // no @slots
              { "@uniquename": "FIREBALL", "@slots": "2" },
              { "@uniquename": "PASSIVE_FIRE_RESIST" },
            ],
          },
        },
      ],
    });
    const index = buildItemIndex(raw);
    const spellKinds = kinds({ PASSIVE_FIRE_RESIST: "passive" });
    const spells = resolveSpells("T4_MAIN_FIRESTAFF", index, spellKinds);

    const byName = Object.fromEntries(spells.map((s) => [s.uniquename, s]));
    expect(byName["FIRE_MAGIC_MISSILE"]?.slot).toBe("1");
    expect(byName["FIREBALL"]?.slot).toBe("2");
    expect(byName["PASSIVE_FIRE_RESIST"]?.kind).toBe("passive");
  });

  it("classifies active/passive/toggle strictly from the spellKinds map, never from @slots", () => {
    const raw = makeRawItems({
      weapon: [
        {
          "@uniquename": "T4_MAIN_SWORD",
          craftingspelllist: {
            craftspell: [
              { "@uniquename": "SOME_ACTIVE_WITH_SLOTS", "@slots": "1" },
              { "@uniquename": "SOME_ACTIVE_NO_SLOTS" },
            ],
          },
        },
      ],
    });
    const index = buildItemIndex(raw);
    // Both spells lack a "passive" entry in spellKinds, so both must be "active"
    // regardless of whether @slots is present — @slots is a group index, not a kind.
    const spellKinds = kinds({});
    const spells = resolveSpells("T4_MAIN_SWORD", index, spellKinds);
    const byName = Object.fromEntries(spells.map((s) => [s.uniquename, s]));
    expect(byName["SOME_ACTIVE_WITH_SLOTS"]?.kind).toBe("active");
    expect(byName["SOME_ACTIVE_NO_SLOTS"]?.kind).toBe("active");
  });

  // Tripwire for decision-004 bug #3: @slots is the index WITHIN the spell's
  // own group, not the active/passive discriminator. T8_ARMOR_PLATE_SET1
  // has passives in BOTH slot group 1 and group 2.
  it("T8_ARMOR_PLATE_SET1 yields passives in both slot group 1 and group 2", () => {
    const raw = makeRawItems({
      equipmentitem: [
        {
          "@uniquename": "T8_ARMOR_PLATE_SET1",
          "@slottype": "armor",
          craftingspelllist: {
            craftspell: [
              { "@uniquename": "OUTOFCOMBATHEAL", "@slots": "1" },
              { "@uniquename": "TAUNT", "@slots": "1" },
              { "@uniquename": "ENRAGE", "@slots": "1" },
              { "@uniquename": "PASSIVE_PLATE_ARMOR_PHYSICAL_RESIST", "@slots": "1" },
              { "@uniquename": "PASSIVE_PLATE_ARMOR_HP_1", "@slots": "1" },
              { "@uniquename": "PASSIVE_PLATE_ARMOR_HP_2", "@slots": "1" },
              { "@uniquename": "PASSIVE_PLATE_ARMOR_ENERGY_1", "@slots": "2" },
              { "@uniquename": "PASSIVE_PLATE_ARMOR_ENERGY_2", "@slots": "2" },
            ],
          },
        },
      ],
    });
    const index = buildItemIndex(raw);
    const spellKinds = kinds({
      OUTOFCOMBATHEAL: "active",
      TAUNT: "active",
      ENRAGE: "active",
      PASSIVE_PLATE_ARMOR_PHYSICAL_RESIST: "passive",
      PASSIVE_PLATE_ARMOR_HP_1: "passive",
      PASSIVE_PLATE_ARMOR_HP_2: "passive",
      PASSIVE_PLATE_ARMOR_ENERGY_1: "passive",
      PASSIVE_PLATE_ARMOR_ENERGY_2: "passive",
    });
    const spells = resolveSpells("T8_ARMOR_PLATE_SET1", index, spellKinds);
    const passives = spells.filter((s) => s.kind === "passive");

    const group1 = passives.filter((s) => s.slot === "1");
    const group2 = passives.filter((s) => s.slot === "2");
    expect(group1.length).toBeGreaterThan(0);
    expect(group2.length).toBeGreaterThan(0);
  });

  it("cycle detection: circular @reference does not hang", () => {
    const raw = makeRawItems({
      weapon: [
        {
          "@uniquename": "ITEM_A",
          craftingspelllist: {
            "@reference": "ITEM_B",
            craftspell: { "@uniquename": "SPELL_A", "@slots": "1" },
          },
        },
        {
          "@uniquename": "ITEM_B",
          craftingspelllist: {
            "@reference": "ITEM_A", // circular
            craftspell: { "@uniquename": "SPELL_B", "@slots": "2" },
          },
        },
      ],
    });
    const index = buildItemIndex(raw);
    expect(() => resolveSpells("ITEM_A", index, kinds({}))).not.toThrow();
  });

  it("handles a single craftspell object (not array)", () => {
    const raw = makeRawItems({
      weapon: [
        {
          "@uniquename": "SINGLE",
          craftingspelllist: {
            craftspell: { "@uniquename": "ONLY_SPELL", "@slots": "1" },
          },
        },
      ],
    });
    const index = buildItemIndex(raw);
    const spells = resolveSpells("SINGLE", index, kinds({}));
    expect(spells).toHaveLength(1);
    expect(spells[0].uniquename).toBe("ONLY_SPELL");
  });

  it("returns empty array for item with no craftingspelllist (bag/cape)", () => {
    const raw = makeRawItems({ equipmentitem: [{ "@uniquename": "T4_BAG" }] });
    const index = buildItemIndex(raw);
    expect(resolveSpells("T4_BAG", index, kinds({}))).toHaveLength(0);
  });

  it("returns empty array for unknown item id", () => {
    expect(resolveSpells("UNKNOWN", new Map(), kinds({}))).toHaveLength(0);
  });
});
