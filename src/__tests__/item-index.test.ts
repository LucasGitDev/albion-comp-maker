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
    localizedNames: { "EN-US": "Great Holy Staff", "PT-BR": "Grande Cajado Sagrado" },
  }),
  item({
    uniquename: "T4_MAIN_HOLYSTAFF",
    slot: "mainhand",
    localizedNames: { "EN-US": "Holy Staff", "PT-BR": "Cajado Sagrado" },
  }),
  item({
    uniquename: "T8_2H_HAMMER",
    slot: "mainhand",
    twohanded: true,
    localizedNames: { "EN-US": "Sacred Hammer", "PT-BR": "Martelo Sagrado" },
  }),
  item({
    uniquename: "T6_2H_BOW@2",
    slot: "mainhand",
    twohanded: true,
    localizedNames: { "EN-US": "Bloodletter", "PT-BR": "Sanguinário" },
  }),
  item({
    uniquename: "T1_OFF_SHIELD",
    slot: "offhand",
    localizedNames: { "EN-US": "Shield", "PT-BR": "Escudo" },
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
      localizedNames: { "EN-US": "Undead Skull", "PT-BR": "Caveira Morta-Viva" },
    });
    const index = buildItemIndex([...FIXTURE, vanity]);
    const results = searchItems(index, "skull", { slot: "mainhand", locale: "en-US" });
    expect(results).toHaveLength(1);
    const found = results[0];
    expect(found.twohanded).toBe(false);
  });
});

describe("performance", () => {
  // Mirrors the real slot histogram in doc-002 §0 (2036 equippable items) at a
  // given scale factor, so we can compare N items against 4N items measured in
  // the *same test run*. See ACM-083 / decision on why this replaces absolute
  // wall-clock budgets.
  function synthesizeCatalogue(scale: number): AOItem[] {
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
    for (const [slot, baseCount] of histogram) {
      const count = Math.max(1, Math.round(baseCount * scale));
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
              "EN-US": `${word1} ${word2} ${slot} ${counter}`,
              "PT-BR": `${word2} ${word1} ${slot} ${counter}`,
            },
          })
        );
        counter++;
      }
    }
    return items;
  }

  // Runs `fn` a few times and keeps the minimum, to smooth out one-off
  // scheduler hiccups without hiding a real complexity regression.
  function measureMin(fn: () => void, repeats = 5): number {
    let best = Infinity;
    for (let i = 0; i < repeats; i++) {
      const start = performance.now();
      fn();
      const elapsed = performance.now() - start;
      if (elapsed < best) best = elapsed;
    }
    return Math.max(best, 0.001);
  }

  // ACM-083: absolute wall-clock budgets (e.g. "under 50ms") are flaky under
  // CPU contention (parallel worktrees / shared CI runners both saw a
  // machine-wide slowdown push these past 50ms with no code regression).
  // Instead we assert *algorithmic complexity*: build/search cost at 4x the
  // catalogue size must not exceed a generous multiple of the cost at 1x,
  // measured back-to-back in the same process. Both measurements suffer the
  // same contention, so the ratio stays stable even on a loaded machine,
  // while it still fails hard if someone introduces e.g. an accidental O(n^2)
  // pass over the catalogue (4x input -> ~16x time would blow the budget).
  const COMPLEXITY_SLACK = 10;

  it("builds the index in roughly linear time as the catalogue grows 4x", () => {
    const small = synthesizeCatalogue(1);
    const large = synthesizeCatalogue(4);
    expect(large.length).toBeGreaterThanOrEqual(small.length * 3.5);

    const smallElapsed = measureMin(() => buildItemIndex(small));
    const largeElapsed = measureMin(() => buildItemIndex(large));

    expect(largeElapsed).toBeLessThan(smallElapsed * COMPLEXITY_SLACK);
  });

  it("searches the mainhand bucket in roughly linear time as it grows 4x", () => {
    const smallCatalogue = synthesizeCatalogue(1);
    const largeCatalogue = synthesizeCatalogue(4);
    const smallIndex = buildItemIndex(smallCatalogue);
    const largeIndex = buildItemIndex(largeCatalogue);
    const queries = ["t8 holy", "fire", "royal iron", "8.3", "sacred"];

    const runQueries = (index: ReturnType<typeof buildItemIndex>) => {
      for (const query of queries) {
        searchItems(index, query, { slot: "mainhand", locale: "en-US" });
      }
    };

    const smallElapsed = measureMin(() => runQueries(smallIndex));
    const largeElapsed = measureMin(() => runQueries(largeIndex));

    expect(largeElapsed).toBeLessThan(smallElapsed * COMPLEXITY_SLACK);
  });
});
