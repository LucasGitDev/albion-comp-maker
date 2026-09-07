import { describe, expect, it } from "vitest";
import type { AOItem } from "@/data/ao-data.d";
import { buildItemIndex, normalize, searchItems } from "@/lib/item-index";

function item(overrides: Partial<AOItem> & { uniquename: string; slot: AOItem["slot"] }): AOItem {
  return {
    localizedNames: {},
    spells: [],
    twohanded: false,
    maxEnchant: 0,
    ...overrides,
  };
}

const FIXTURE: AOItem[] = [
  item({
    uniquename: "T8_2H_HOLYSTAFF",
    slot: "mainhand",
    twohanded: true,
    localizedNames: { "en-US": "Great Holy Staff", "pt-BR": "Grande Cajado Sagrado" },
  }),
  item({
    uniquename: "T4_MAIN_HOLYSTAFF",
    slot: "mainhand",
    localizedNames: { "en-US": "Holy Staff", "pt-BR": "Cajado Sagrado" },
  }),
  item({
    uniquename: "T8_2H_HAMMER",
    slot: "mainhand",
    twohanded: true,
    localizedNames: { "en-US": "Sacred Hammer", "pt-BR": "Martelo Sagrado" },
  }),
  item({
    uniquename: "T6_2H_BOW@2",
    slot: "mainhand",
    twohanded: true,
    localizedNames: { "en-US": "Bloodletter", "pt-BR": "Sanguinário" },
  }),
  item({
    uniquename: "T1_OFF_SHIELD",
    slot: "offhand",
    localizedNames: { "en-US": "Shield", "pt-BR": "Escudo" },
  }),
];

describe("normalize", () => {
  it("strips diacritics, lowercases and collapses whitespace", () => {
    expect(normalize("  Bastão   Sagrado ")).toBe("bastao sagrado");
  });
});

describe("searchItems", () => {
  it("filters by slot as a hard map-lookup, not a scan", () => {
    const index = buildItemIndex(FIXTURE);
    const results = searchItems(index, "", { slot: "offhand", locale: "en-US" });
    expect(results).toHaveLength(1);
    expect(results[0].uniquename).toBe("T1_OFF_SHIELD");
  });

  it("matches diacritic-free PT-BR queries against accented names", () => {
    const index = buildItemIndex(FIXTURE);
    const results = searchItems(index, "cajado sagrado", { slot: "mainhand", locale: "pt-BR" });
    expect(results.map((r) => r.uniquename)).toContain("T4_MAIN_HOLYSTAFF");
  });

  it("parses a tier token as a hard filter, not literal text", () => {
    const index = buildItemIndex(FIXTURE);
    const results = searchItems(index, "t8 holy", { slot: "mainhand", locale: "en-US" });
    expect(results.map((r) => r.uniquename)).toEqual(["T8_2H_HOLYSTAFF"]);
  });

  it("parses tier.enchant tokens", () => {
    const index = buildItemIndex(FIXTURE);
    const results = searchItems(index, "6.2", { slot: "mainhand", locale: "en-US" });
    expect(results.map((r) => r.uniquename)).toEqual(["T6_2H_BOW@2"]);
  });

  it("searches both configured locales regardless of active UI language", () => {
    const index = buildItemIndex(FIXTURE);
    const results = searchItems(index, "sanguin", { slot: "mainhand", locale: "en-US" });
    expect(results.map((r) => r.uniquename)).toContain("T6_2H_BOW@2");
  });

  it("ranks a full-name prefix match above a word-prefix match", () => {
    const index = buildItemIndex(FIXTURE);
    const results = searchItems(index, "holy", { slot: "mainhand", locale: "en-US" });
    // "Holy Staff" starts with "holy" (score 10); "Great Holy Staff" only has a
    // word starting with "holy" (score 20) — the full-name prefix wins.
    expect(results.map((r) => r.uniquename)).toEqual(["T4_MAIN_HOLYSTAFF", "T8_2H_HOLYSTAFF"]);
  });

  it("returns items via uniquename match as a last resort", () => {
    const index = buildItemIndex(FIXTURE);
    const results = searchItems(index, "off_shield", { slot: "offhand", locale: "en-US" });
    expect(results.map((r) => r.uniquename)).toEqual(["T1_OFF_SHIELD"]);
  });

  it("respects twohanded as an authoritative field, never inferred from the id", () => {
    // UNIQUE_VANITY_2H_SKULL_UNDEAD_AJ has "_2H_" in its name but twohanded=false (ACM-026).
    const vanity = item({
      uniquename: "UNIQUE_VANITY_2H_SKULL_UNDEAD_AJ",
      slot: "mainhand",
      twohanded: false,
    maxEnchant: 0,
      localizedNames: { "en-US": "Undead Skull", "pt-BR": "Caveira Morta-Viva" },
    });
    const index = buildItemIndex([...FIXTURE, vanity]);
    const results = searchItems(index, "skull", { slot: "mainhand", locale: "en-US" });
    expect(results).toHaveLength(1);
    const found = results[0];
    expect(found.twohanded).toBe(false);
  });
});

describe("performance", () => {
  function synthesizeCatalogue(): AOItem[] {
    // Mirrors the real slot histogram in doc-002 §0 (2036 equippable items).
    const histogram: Array<[AOItem["slot"], number]> = [
      ["mainhand", 817],
      ["head", 280],
      ["armor", 264],
      ["shoes", 256],
      ["cape", 196],
      ["offhand", 111],
      ["mount", 100],
      ["bag", 12],
    ];
    const items: AOItem[] = [];
    const words = ["Holy", "Fire", "Frost", "Great", "Cursed", "Bastard", "Royal", "Iron", "Sacred"];
    let counter = 0;
    for (const [slot, count] of histogram) {
      for (let i = 0; i < count; i++) {
        const tier = (counter % 8) + 1;
        const enchant = counter % 5;
        const word1 = words[counter % words.length];
        const word2 = words[(counter + 3) % words.length];
        const suffix = enchant > 0 ? `@${enchant}` : "";
        items.push(
          item({
            uniquename: `T${tier}_${slot.toUpperCase()}_ITEM_${counter}${suffix}`,
            slot,
            twohanded: slot === "mainhand" && counter % 3 === 0,
            localizedNames: {
              "en-US": `${word1} ${word2} ${slot} ${counter}`,
              "pt-BR": `${word2} ${word1} ${slot} ${counter}`,
            },
          })
        );
        counter++;
      }
    }
    return items;
  }

  it("filters the real-sized mainhand bucket in well under 50ms after the debounce", () => {
    const catalogue = synthesizeCatalogue();
    expect(catalogue).toHaveLength(2036);
    const index = buildItemIndex(catalogue);

    const queries = ["t8 holy", "fire", "royal iron", "8.3", "sacred"];
    const start = performance.now();
    for (const query of queries) {
      searchItems(index, query, { slot: "mainhand", locale: "en-US" });
    }
    const elapsed = performance.now() - start;

    // 5 full passes over the 817-item mainhand bucket, well under the 50ms budget.
    expect(elapsed).toBeLessThan(50);
  });

  it("builds the full 2036-item index in a single fast pass", () => {
    const catalogue = synthesizeCatalogue();
    const start = performance.now();
    buildItemIndex(catalogue);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
