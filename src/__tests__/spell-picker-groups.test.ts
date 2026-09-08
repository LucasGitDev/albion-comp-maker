import { describe, expect, it } from "vitest";
import type { AOItemSpell } from "@/data/ao-data";
import { computeAutoSelections, groupItemSpells, type SpellCandidate } from "@/components/editor/spell-groups";
import type { SpellGroup } from "@/types/build";

/**
 * Real item/spell ids from src/__tests__/fixtures/ao-corpus.json
 * (T4_ARMOR_PLATE_SET3: OUTOFCOMBATHEAL/TAUNT/ENFEEBLEAURA/PASSIVE_ARMOR_MR_AR/
 * PASSIVE_ARMOR_CCDURATION), not fabricated ids. The fixture's own `spells`
 * registry only carries `kind` (no `localizedNames`), so `localizedNames` is
 * added here to exercise tooltip resolution — the ids themselves are real.
 */
function spell(overrides: Partial<AOItemSpell> & Pick<AOItemSpell, "uniquename" | "slotGroup" | "kind">): AOItemSpell {
  return { localizedNames: { "EN-US": overrides.uniquename }, ...overrides };
}

describe("groupItemSpells (ACM-010 AC #1, #2, #3)", () => {
  it("maps active spells to Q/W/E by their own slotGroup and collects passives separately", () => {
    const spells: AOItemSpell[] = [
      spell({ uniquename: "OUTOFCOMBATHEAL", slotGroup: "1", kind: "active" }),
      spell({ uniquename: "TAUNT", slotGroup: "1", kind: "active" }),
      spell({ uniquename: "ENFEEBLEAURA", slotGroup: "1", kind: "toggle" }),
      spell({ uniquename: "PASSIVE_ARMOR_MR_AR", slotGroup: "1", kind: "passive" }),
      spell({ uniquename: "PASSIVE_PLATEARMOR_HEALTH_REDUCTION", slotGroup: "2", kind: "passive" }),
    ];

    const groups = groupItemSpells(spells, "en-US");

    expect(groups.q?.map((c) => c.uniquename)).toEqual([
      "OUTOFCOMBATHEAL",
      "TAUNT",
      "ENFEEBLEAURA",
    ]);
    expect(groups.w).toBeUndefined();
    expect(groups.e).toBeUndefined();
    expect(groups.passive?.map((c) => c.uniquename)).toEqual([
      "PASSIVE_ARMOR_MR_AR",
      "PASSIVE_PLATEARMOR_HEALTH_REDUCTION",
    ]);
  });

  it("maps distinct active slotGroups to Q/W/E respectively (real trumpet vanity item shape)", () => {
    const spells: AOItemSpell[] = [
      spell({ uniquename: "VANITY_TRUMPET_TUNE_A", slotGroup: "1", kind: "active" }),
      spell({ uniquename: "VANITY_TRUMPET_TUNE_B", slotGroup: "2", kind: "active" }),
      spell({ uniquename: "VANITY_TRUMPET_TUNE_C", slotGroup: "3", kind: "active" }),
    ];

    const groups = groupItemSpells(spells, "en-US");

    expect(groups.q?.map((c) => c.uniquename)).toEqual(["VANITY_TRUMPET_TUNE_A"]);
    expect(groups.w?.map((c) => c.uniquename)).toEqual(["VANITY_TRUMPET_TUNE_B"]);
    expect(groups.e?.map((c) => c.uniquename)).toEqual(["VANITY_TRUMPET_TUNE_C"]);
  });

  it("returns an empty record (no groups at all) for an item with zero spells, e.g. any offhand (decision-005)", () => {
    const groups = groupItemSpells([], "en-US");
    expect(groups).toEqual({});
  });

  it("resolves candidate names from the active locale, falling back to the uniquename", () => {
    const spells: AOItemSpell[] = [
      {
        uniquename: "TAUNT",
        slotGroup: "1",
        kind: "active",
        localizedNames: { "EN-US": "Taunt", "PT-BR": "Provocar" },
      },
      {
        uniquename: "PASSIVE_ARMOR_MR_AR",
        slotGroup: "1",
        kind: "passive",
        localizedNames: {},
      },
    ];

    expect(groupItemSpells(spells, "pt-BR").q?.[0].name).toBe("Provocar");
    expect(groupItemSpells(spells, "en-US").q?.[0].name).toBe("Taunt");
    expect(groupItemSpells(spells, "pt-BR").passive?.[0].name).toBe("PASSIVE_ARMOR_MR_AR");
  });

  it("de-dupes a spell repeated across the inheritance chain within the same group", () => {
    const spells: AOItemSpell[] = [
      spell({ uniquename: "TAUNT", slotGroup: "1", kind: "active" }),
      spell({ uniquename: "TAUNT", slotGroup: "1", kind: "active" }),
    ];
    expect(groupItemSpells(spells, "en-US").q).toHaveLength(1);
  });
});

const NO_SELECTION: Record<SpellGroup, string | null> = { q: null, w: null, e: null, passive: null };
const SINGLE_E: SpellCandidate[] = [{ uniquename: "VANITY_TRUMPET_TUNE_C", name: "Tune C" }];
const MULTI_Q: SpellCandidate[] = [
  { uniquename: "OUTOFCOMBATHEAL", name: "Out of Combat Heal" },
  { uniquename: "TAUNT", name: "Taunt" },
];

describe("computeAutoSelections (ACM-089)", () => {
  it("auto-fills a group with exactly one candidate", () => {
    const updates = computeAutoSelections(NO_SELECTION, { e: SINGLE_E });
    expect(updates).toEqual({ e: "VANITY_TRUMPET_TUNE_C" });
  });

  it("is scoped to E only — a single-candidate Q or passive is left for the picker (decision: real weapon Q/W always have multiple options; E never does)", () => {
    const singleQ: SpellCandidate[] = [{ uniquename: "TAUNT", name: "Taunt" }];
    const singlePassive: SpellCandidate[] = [{ uniquename: "PASSIVE_ARMOR_MR_AR", name: "Armor Resistance" }];
    expect(computeAutoSelections(NO_SELECTION, { q: singleQ })).toEqual({});
    expect(computeAutoSelections(NO_SELECTION, { passive: singlePassive })).toEqual({});
  });

  it("does not propose an update for a group with two or more candidates", () => {
    const updates = computeAutoSelections(NO_SELECTION, { q: MULTI_Q });
    expect(updates).toEqual({});
  });

  it("does not clobber an existing explicit selection in a multi-candidate group", () => {
    const selected: Record<SpellGroup, string | null> = { ...NO_SELECTION, q: "TAUNT" };
    const updates = computeAutoSelections(selected, { q: MULTI_Q });
    expect(updates).toEqual({});
  });

  it("is a no-op once the single candidate is already selected (idempotent across re-renders)", () => {
    const selected: Record<SpellGroup, string | null> = { ...NO_SELECTION, e: "VANITY_TRUMPET_TUNE_C" };
    const updates = computeAutoSelections(selected, { e: SINGLE_E });
    expect(updates).toEqual({});
  });

  it("re-derives the auto-selection when the equipped item (and its candidates) changes", () => {
    // Item A's E has one candidate, auto-selected.
    const afterItemA = computeAutoSelections(NO_SELECTION, { e: SINGLE_E });
    const selected: Record<SpellGroup, string | null> = { ...NO_SELECTION, e: afterItemA.e ?? null };
    expect(selected.e).toBe("VANITY_TRUMPET_TUNE_C");

    // Equip item B: different single E candidate — the stale selection from
    // item A no longer matches, so a fresh update is proposed.
    const itemBCandidate: SpellCandidate[] = [{ uniquename: "OTHER_WEAPON_E", name: "Other E" }];
    const afterItemB = computeAutoSelections(selected, { e: itemBCandidate });
    expect(afterItemB).toEqual({ e: "OTHER_WEAPON_E" });
  });
});
