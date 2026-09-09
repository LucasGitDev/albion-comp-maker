/**
 * Phase 1 acceptance tests (PRD Section 3 / ACM-005), run against a committed
 * pruned REAL corpus — see decision-005 for why this is not a live CDN sync
 * and not a hand-curated fixture.
 *
 * The corpus is brought in via a STATIC import. If
 * `src/__tests__/fixtures/ao-corpus.json` is absent, this module fails to
 * compile — the suite goes red, never silently green. No existsSync, no
 * skipIf, no try/catch fallback, no dynamic import: it must be structurally
 * impossible to pass without having examined real data.
 */

import { describe, expect, it } from "vitest";
import corpus from "./fixtures/ao-corpus.json";

type CorpusSpell = { uniquename: string; slotGroup: string; kind: string };
type CorpusItem = { uniquename: string; slot: string; spells: CorpusSpell[] };
type Corpus = { items: CorpusItem[]; spells: Record<string, string> };

const data = corpus as Corpus;

// Guard against a pipeline that emits a near-empty artifact and exits 0 —
// this project already lost a full task (ACM-024/025) to exactly that bug.
if (data.items.length < 2000) {
  throw new Error(
    `acceptance corpus looks truncated: expected >=2000 items, got ${data.items.length}. ` +
      `Regenerate with 'pnpm build:fixture' against a real sync.`,
  );
}

function findItem(uniquename: string): CorpusItem {
  const item = data.items.find((i) => i.uniquename === uniquename);
  if (!item) {
    throw new Error(`acceptance corpus is missing required item "${uniquename}"`);
  }
  return item;
}

describe("AC-1: T8_2H_HAMMER_UNDEAD artifact swap", () => {
  const base = findItem("T8_2H_HAMMER");
  const artifact = findItem("T8_2H_HAMMER_UNDEAD");

  it("base T8_2H_HAMMER has HAMMERTACKLE (slotGroup 3, active) — non-vacuous precondition", () => {
    const hammertackle = base.spells.find((s) => s.uniquename === "HAMMERTACKLE");
    expect(hammertackle).toBeDefined();
    expect(hammertackle?.slotGroup).toBe("3");
    expect(hammertackle?.kind).toBe("active");
  });

  it("artifact replaces HAMMERTACKLE with UNDEADHAND in slotGroup 3, and nothing else differs", () => {
    expect(artifact.spells.find((s) => s.uniquename === "HAMMERTACKLE")).toBeUndefined();

    const undeadhand = artifact.spells.find((s) => s.uniquename === "UNDEADHAND");
    expect(undeadhand).toBeDefined();
    expect(undeadhand?.slotGroup).toBe("3");
    expect(undeadhand?.kind).toBe("active");

    // Exactly one swap: every other base spell must be present, unchanged, on the artifact.
    const baseOther = base.spells.filter((s) => s.uniquename !== "HAMMERTACKLE");
    const artifactOther = artifact.spells.filter((s) => s.uniquename !== "UNDEADHAND");

    expect(artifactOther).toHaveLength(baseOther.length);
    const byName = new Map(artifactOther.map((s) => [s.uniquename, s]));
    for (const baseSpell of baseOther) {
      const artifactSpell = byName.get(baseSpell.uniquename);
      expect(artifactSpell, `expected ${baseSpell.uniquename} to survive on the artifact`).toBeDefined();
      expect(artifactSpell?.slotGroup).toBe(baseSpell.slotGroup);
      expect(artifactSpell?.kind).toBe(baseSpell.kind);
    }
  });
});

describe("AC-2: T4_MAIN_HAMMER spell slots", () => {
  const item = findItem("T4_MAIN_HAMMER");

  it("resolves HAMMER_SHOVE in slotGroup 1 (string, not number)", () => {
    const spell = item.spells.find((s) => s.uniquename === "HAMMER_SHOVE");
    expect(spell).toBeDefined();
    expect(spell?.slotGroup).toBe("1");
    expect(typeof spell?.slotGroup).toBe("string");
  });

  it("resolves HAMMERWHIRLWIND2 in slotGroup 3", () => {
    const spell = item.spells.find((s) => s.uniquename === "HAMMERWHIRLWIND2");
    expect(spell).toBeDefined();
    expect(spell?.slotGroup).toBe("3");
  });

  it("resolves PASSIVE_STUNCHANCE as passive", () => {
    const spell = item.spells.find((s) => s.uniquename === "PASSIVE_STUNCHANCE");
    expect(spell).toBeDefined();
    expect(spell?.kind).toBe("passive");
  });
});

// AC-3 (revised, decision-005): the original "every item has >=1 spell" was
// factually false — 584 of 2036 items legitimately have zero spell slots
// upstream (vanity gear, gathering tools, plain capes/shields, base mounts,
// and ALL offhands). This replaces it with per-slot coverage floors pinned
// against the corpus measured on 2026-09-07, so a real regression (a slot
// category collapsing to near-zero) is still caught.
describe("AC-3: per-slot spell coverage invariant", () => {
  // These numbers are pinned snapshots of the corpus as of 2026-09-07, not
  // derived invariants — every value here MUST be updated by hand whenever
  // `src/__tests__/fixtures/ao-corpus.json` is regenerated (`pnpm sync:ao &&
  // pnpm build:fixture`), because upstream Albion patches add/remove items
  // and spells over time.
  //
  // If the nightly drift-check workflow (.github/workflows/nightly-ao.yml)
  // goes red because these tests fail after a regeneration:
  //   1. Diff the regenerated fixture against the previous commit and look at
  //      *what* changed (new/removed items, spells moving slots, etc).
  //   2. If the diff matches a real, expected upstream patch note — bump the
  //      pinned numbers below (and in the "corpus totals" test) to match,
  //      and commit the new fixture alongside.
  //   3. If the diff is unexplained by any known upstream change, or a whole
  //      slot's `withSpells` count collapses towards 0 — treat it as a real
  //      regression in the resolver/emitter pipeline, do NOT just bump the
  //      numbers, and investigate before touching this file.
  const SLOT_FLOORS: Record<string, { total: number; withSpells: number }> = {
    offhand: { total: 111, withSpells: 0 },
    cape: { total: 196, withSpells: 100 },
    bag: { total: 12, withSpells: 12 },
    shoes: { total: 257, withSpells: 180 },
    head: { total: 281, withSpells: 191 },
    armor: { total: 265, withSpells: 181 },
    mainhand: { total: 817, withSpells: 758 },
    mount: { total: 100, withSpells: 33 },
    food: { total: 58, withSpells: 0 },
    potion: { total: 45, withSpells: 0 },
  };

  it("corpus totals match the pinned floors: 2142 items, 1455 with >=1 spell", () => {
    expect(data.items.length).toBe(2142);
    const withSpells = data.items.filter((i) => i.spells.length > 0).length;
    expect(withSpells).toBe(1455);
  });

  it.each(Object.entries(SLOT_FLOORS))(
    "slot '%s' has the pinned item count and spell coverage",
    (slot, expected) => {
      const itemsInSlot = data.items.filter((i) => i.slot === slot);
      expect(itemsInSlot.length).toBe(expected.total);
      const withSpells = itemsInSlot.filter((i) => i.spells.length > 0).length;
      expect(withSpells).toBe(expected.withSpells);
    },
  );

  it("no offhand item has any spell — offhands grant zero abilities upstream", () => {
    const offhands = data.items.filter((i) => i.slot === "offhand");
    expect(offhands.length).toBeGreaterThan(0);
    for (const offhand of offhands) {
      expect(offhand.spells).toHaveLength(0);
    }
  });
});

describe("AC-4: every resolved spell id exists in the registry", () => {
  it("iterates every item-spell pair and finds it in data.spells", () => {
    let pairsChecked = 0;
    const missing: string[] = [];

    for (const item of data.items) {
      for (const spell of item.spells) {
        pairsChecked++;
        if (!Object.hasOwn(data.spells, spell.uniquename)) {
          missing.push(`${item.uniquename} -> ${spell.uniquename}`);
        }
      }
    }

    // Guard against a corpus that vacuously "passes" by having almost no
    // item-spell pairs to check in the first place.
    expect(pairsChecked).toBeGreaterThan(5000);
    expect(missing).toEqual([]);
  });
});
