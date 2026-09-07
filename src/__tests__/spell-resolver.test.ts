import { describe, it, expect } from "vitest";
import {
  buildItemIndex,
  resolveSpells,
  type RawItem,
} from "../lib/spell-resolver";

// --- fixture helpers ---

function makeIndex(items: RawItem[]) {
  return buildItemIndex(items);
}

// --- AC #1: artifact item inherits parent spells and respects removespell ---

describe("resolveSpells", () => {
  it("AC1: artifact item inherits spells and excludes removed base spells", () => {
    const items: RawItem[] = [
      {
        "@uniquename": "T8_BASE_HAMMER",
        craftingspells: {
          craftingspell: [
            { "@uniquename": "BASE_SPELL_1", "@slot": "1" },
            { "@uniquename": "BASE_SPELL_2", "@slot": "2" },
          ],
        },
      },
      {
        "@uniquename": "T8_2H_HAMMER_UNDEAD",
        "@craftingspelllist": "T8_BASE_HAMMER",
        craftingspells: {
          craftingspell: [{ "@uniquename": "ARTIFACT_SPELL", "@slot": "3" }],
          removespell: [{ "@uniquename": "BASE_SPELL_2" }],
        },
      },
    ];
    const index = makeIndex(items);
    const spells = resolveSpells("T8_2H_HAMMER_UNDEAD", index);

    const names = spells.map((s) => s.uniquename);
    expect(names).toContain("ARTIFACT_SPELL");
    expect(names).toContain("BASE_SPELL_1");
    expect(names).not.toContain("BASE_SPELL_2"); // removed
  });

  // AC #2: T4_MAIN_HAMMER resolves specific slots
  it("AC2: hammer resolves HAMMER_SHOVE slot-1, HAMMERWHIRLWIND2 slot-3, passive", () => {
    const items: RawItem[] = [
      {
        "@uniquename": "T4_MAIN_HAMMER_BASE",
        craftingspells: {
          craftingspell: [
            { "@uniquename": "HAMMER_SHOVE", "@slot": "1" },
            { "@uniquename": "HAMMERWHIRLWIND2", "@slot": "3" },
            { "@uniquename": "PASSIVE_STUNCHANCE", "@slot": "passive" },
          ],
        },
      },
      {
        "@uniquename": "T4_MAIN_HAMMER",
        "@craftingspelllist": "T4_MAIN_HAMMER_BASE",
      },
    ];
    const index = makeIndex(items);
    const spells = resolveSpells("T4_MAIN_HAMMER", index);

    const byName = Object.fromEntries(spells.map((s) => [s.uniquename, s]));
    expect(byName["HAMMER_SHOVE"]?.slot).toBe("1");
    expect(byName["HAMMERWHIRLWIND2"]?.slot).toBe("3");
    expect(byName["PASSIVE_STUNCHANCE"]?.slot).toBe("passive");
  });

  // AC #5: cycle detection must not hang
  it("AC5: circular @craftingspelllist reference does not hang", () => {
    const items: RawItem[] = [
      {
        "@uniquename": "ITEM_A",
        "@craftingspelllist": "ITEM_B",
        craftingspells: {
          craftingspell: { "@uniquename": "SPELL_A", "@slot": "1" },
        },
      },
      {
        "@uniquename": "ITEM_B",
        "@craftingspelllist": "ITEM_A", // circular
        craftingspells: {
          craftingspell: { "@uniquename": "SPELL_B", "@slot": "2" },
        },
      },
    ];
    const index = makeIndex(items);
    // Should return without hanging; result may be partial but must not throw
    expect(() => resolveSpells("ITEM_A", index)).not.toThrow();
  });

  // toArray: single-object craftingspell (not array) must work
  it("handles single craftingspell object (not array)", () => {
    const items: RawItem[] = [
      {
        "@uniquename": "SINGLE",
        craftingspells: {
          craftingspell: { "@uniquename": "ONLY_SPELL", "@slot": "1" },
        },
      },
    ];
    const index = makeIndex(items);
    const spells = resolveSpells("SINGLE", index);
    expect(spells).toHaveLength(1);
    expect(spells[0].uniquename).toBe("ONLY_SPELL");
  });

  it("returns empty array for item with no spells (bag/cape)", () => {
    const items: RawItem[] = [{ "@uniquename": "T4_BAG" }];
    const index = makeIndex(items);
    expect(resolveSpells("T4_BAG", index)).toHaveLength(0);
  });

  it("returns empty array for unknown item id", () => {
    expect(resolveSpells("UNKNOWN", new Map())).toHaveLength(0);
  });
});
