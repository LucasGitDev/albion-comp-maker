/**
 * Phase 1 acceptance tests (PRD Section 3).
 * Tests 1–2 use inline fixtures (no CDN required).
 * Tests 3–4 use src/data/ao-data.json if present, else the committed fixture.
 * Run `pnpm sync:ao` before `pnpm test` to validate against real data.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { buildItemIndex, resolveSpells, type RawItem } from "../src/lib/spell-resolver";
import type { AOData } from "../src/data/ao-data";

// ─── Fixtures for tests 1 & 2 (inline) ───────────────────────────────────────

const HAMMER_ITEMS: RawItem[] = [
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
  { "@uniquename": "T4_MAIN_HAMMER", "@craftingspelllist": "T4_MAIN_HAMMER_BASE" },
  {
    "@uniquename": "T8_BASE_HAMMER",
    craftingspells: {
      craftingspell: [
        { "@uniquename": "BASE_SPELL_A", "@slot": "1" },
        { "@uniquename": "BASE_SPELL_B", "@slot": "2" },
      ],
    },
  },
  {
    "@uniquename": "T8_2H_HAMMER_UNDEAD",
    "@craftingspelllist": "T8_BASE_HAMMER",
    craftingspells: {
      craftingspell: [{ "@uniquename": "ARTIFACT_UNDEAD_SPELL", "@slot": "3" }],
      removespell: [{ "@uniquename": "BASE_SPELL_B" }],
    },
  },
];

// ─── ao-data.json loader (real or fixture) ────────────────────────────────────

function loadAOData(): AOData {
  const realPath    = join(process.cwd(), "src", "data", "ao-data.json");
  const fixturePath = join(process.cwd(), "__fixtures__", "ao-data-fixture.json");
  const path = existsSync(realPath) ? realPath : fixturePath;
  return JSON.parse(readFileSync(path, "utf8")) as AOData;
}

// ─── Test 1: T8_2H_HAMMER_UNDEAD ─────────────────────────────────────────────

describe("Phase 1 AC-1: T8_2H_HAMMER_UNDEAD spell chain", () => {
  it("artifact-exclusive spell present; removed base spell absent", () => {
    const index  = buildItemIndex(HAMMER_ITEMS);
    const spells = resolveSpells("T8_2H_HAMMER_UNDEAD", index);
    const names  = spells.map((s) => s.uniquename);

    expect(names).toContain("ARTIFACT_UNDEAD_SPELL");
    expect(names).toContain("BASE_SPELL_A");        // inherited, not removed
    expect(names).not.toContain("BASE_SPELL_B");    // explicitly removed
  });
});

// ─── Test 2: T4_MAIN_HAMMER ──────────────────────────────────────────────────

describe("Phase 1 AC-2: T4_MAIN_HAMMER spell slots", () => {
  it("resolves HAMMER_SHOVE slot-1, HAMMERWHIRLWIND2 slot-3, PASSIVE_STUNCHANCE passive", () => {
    const index  = buildItemIndex(HAMMER_ITEMS);
    const spells = resolveSpells("T4_MAIN_HAMMER", index);
    const byName = Object.fromEntries(spells.map((s) => [s.uniquename, s]));

    expect(byName["HAMMER_SHOVE"]?.slot).toBe("1");
    expect(byName["HAMMERWHIRLWIND2"]?.slot).toBe("3");
    expect(byName["PASSIVE_STUNCHANCE"]?.slot).toBe("passive");
  });
});

// ─── Test 3: every equipment item has >= 1 active or passive ─────────────────

describe("Phase 1 AC-3: all equipment items have at least 1 spell", () => {
  it("no item has an empty spell list (bags/capes excepted by logging)", () => {
    const data = loadAOData();
    const BAG_CAPE_SLOTS = new Set(["bag", "cape", "mount", "food", "potion"]);

    const failing: string[] = [];
    for (const item of data.items) {
      if (BAG_CAPE_SLOTS.has(item.slot)) continue;
      if (item.spells.length === 0) failing.push(item.uniquename);
    }
    if (failing.length > 0) {
      console.warn(`[AC-3] items with 0 spells: ${failing.slice(0, 5).join(", ")}${failing.length > 5 ? "…" : ""}`);
    }
    expect(failing).toHaveLength(0);
  });
});

// ─── Test 4: no resolved spell id absent from spells registry ─────────────────

describe("Phase 1 AC-4: no resolved spell references unknown ID", () => {
  it("every spell in every item exists in the spells registry", () => {
    const data    = loadAOData();
    const unknown: string[] = [];

    for (const item of data.items) {
      for (const spell of item.spells) {
        if (!data.spells[spell.uniquename]) {
          unknown.push(`${item.uniquename} → ${spell.uniquename}`);
        }
      }
    }
    if (unknown.length > 0) {
      console.warn(`[AC-4] unknown spell refs: ${unknown.slice(0, 3).join(", ")}`);
    }
    expect(unknown).toHaveLength(0);
  });
});
