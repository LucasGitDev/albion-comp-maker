import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyBuild } from "@/types/build";

const readFile = vi.fn();

vi.mock("node:fs", () => {
  const promises = { readFile: (...args: unknown[]) => readFile(...args) };
  return { promises, default: { promises } };
});

/**
 * Exercises the REAL `buildCardLookupsFor` implementation (not mocked, as
 * `public-pages.test.tsx` does to isolate the page components) against a
 * fixture using the real artifact casing (`EN-US`/`PT-BR`), matching what
 * `sync:ao` actually emits. This is the regression guard for ACM-040 review
 * round 2: a plain `item.localizedNames[LOCALE]` lookup against a lowercase
 * `LOCALE` constant silently misses every real record and falls back to the
 * raw uniquename — the public `/build/[slug]` and `/comp/[slug]` pages would
 * show `T4_MAIN_SWORD` instead of "Broadsword" to anyone opening a shared
 * link, and no other test in the suite runs this module's real logic.
 */
describe("buildCardLookupsFor (ACM-040 review round 2 regression)", () => {
  beforeEach(() => {
    vi.resetModules();
    readFile.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("resolves the localized item and spell names using the real artifact casing (EN-US)", async () => {
    readFile.mockResolvedValue(
      JSON.stringify({
        version: "2026-01-01",
        items: [
          {
            uniquename: "T4_MAIN_SWORD",
            slot: "mainhand",
            localizedNames: { "EN-US": "Broadsword", "PT-BR": "Espada Larga" },
            twohanded: false,
            maxEnchant: 4,
            spells: [
              {
                uniquename: "SWORD_Q_ABILITY",
                slotGroup: "1",
                kind: "active",
                localizedNames: { "EN-US": "Whirlwind", "PT-BR": "Redemoinho" },
              },
            ],
          },
        ],
        spells: {},
      })
    );

    const { buildCardLookupsFor } = await import("@/lib/build-card-lookups");
    const state = createEmptyBuild();
    state.slots.mainhand = {
      itemId: "T4_MAIN_SWORD",
      tier: 4,
      enchant: 0,
      spells: { q: "SWORD_Q_ABILITY", w: null, e: null, passive: null },
      twohanded: false,
      maxEnchant: 4,
    };

    const lookups = await buildCardLookupsFor(state);

    expect(lookups.itemNames["T4_MAIN_SWORD"]).toBe("Broadsword");
    expect(lookups.spellNames["SWORD_Q_ABILITY"]).toBe("Whirlwind");
    expect(lookups.spellGroupsByItem["T4_MAIN_SWORD"]).toEqual(["q"]);
  });

  it("falls back to the raw uniquename when the item has no name for the requested locale", async () => {
    readFile.mockResolvedValue(
      JSON.stringify({
        version: "2026-01-01",
        items: [
          {
            uniquename: "T4_HEAD_PLATE_SET1",
            slot: "head",
            localizedNames: { "PT-BR": "Elmo do Soldado" },
            twohanded: false,
            maxEnchant: 4,
            spells: [],
          },
        ],
        spells: {},
      })
    );

    const { buildCardLookupsFor } = await import("@/lib/build-card-lookups");
    const state = createEmptyBuild();
    state.slots.head = {
      itemId: "T4_HEAD_PLATE_SET1",
      tier: 4,
      enchant: 0,
      spells: { q: null, w: null, e: null, passive: null },
      twohanded: false,
      maxEnchant: 4,
    };

    const lookups = await buildCardLookupsFor(state);

    expect(lookups.itemNames["T4_HEAD_PLATE_SET1"]).toBe("T4_HEAD_PLATE_SET1");
  });
});
