import { beforeEach, describe, expect, it } from "vitest";
import { selectActions, selectBuild, useBuildStore } from "@/store/build-store";
import { SLOT_ORDER } from "@/types/build";

beforeEach(() => {
  useBuildStore.getState().actions.reset();
});

describe("build store", () => {
  it("initializes with all 10 slots present and empty", () => {
    const build = selectBuild(useBuildStore.getState());
    expect(Object.keys(build.slots).sort()).toEqual([...SLOT_ORDER].sort());
    for (const slot of SLOT_ORDER) {
      expect(build.slots[slot]).toBeNull();
    }
  });

  it("AC #2: selecting an item in a slot updates the store", () => {
    const { setItem } = selectActions(useBuildStore.getState());
    setItem("head", { uniquename: "T8_HEAD_PLATE_SET1", twohanded: false }, 8, 1);

    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.head).toEqual({
      itemId: "T8_HEAD_PLATE_SET1",
      tier: 8,
      enchant: 1,
      spells: { q: null, w: null, e: null, passive: null },
      twohanded: false,
    });
  });

  it("AC #3: selecting a spell updates the store", () => {
    const { setItem, setSpell } = selectActions(useBuildStore.getState());
    setItem("mainhand", { uniquename: "T8_MAIN_SWORD", twohanded: false }, 8, 0);
    setSpell("mainhand", "q", "SWORD_Q_SPELL");

    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.mainhand?.spells.q).toBe("SWORD_Q_SPELL");
    expect(build.slots.mainhand?.spells.w).toBeNull();
  });

  it("setSpell on an empty slot is a no-op", () => {
    const { setSpell } = selectActions(useBuildStore.getState());
    setSpell("mainhand", "q", "ORPHAN_SPELL");
    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.mainhand).toBeNull();
  });

  it("equipping a two-handed mainhand clears and locks offhand", () => {
    const { setItem } = selectActions(useBuildStore.getState());
    setItem("offhand", { uniquename: "T8_OFFHAND_BOOK", twohanded: false }, 8, 0);
    setItem("mainhand", { uniquename: "T8_2H_HAMMER", twohanded: true }, 8, 0);

    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.offhand).toBeNull();
  });

  it("setting an offhand item while mainhand is already two-handed is a no-op (store-level lock)", () => {
    const { setItem } = selectActions(useBuildStore.getState());
    setItem("mainhand", { uniquename: "T8_2H_HAMMER", twohanded: true }, 8, 0);
    setItem("offhand", { uniquename: "T8_OFFHAND_BOOK", twohanded: false }, 8, 0);

    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.offhand).toBeNull();
  });

  it("clearing the two-handed mainhand does not retroactively unlock offhand from a stale call", () => {
    const { setItem, clearSlot } = selectActions(useBuildStore.getState());
    setItem("mainhand", { uniquename: "T8_2H_HAMMER", twohanded: true }, 8, 0);
    clearSlot("mainhand");
    setItem("offhand", { uniquename: "T8_OFFHAND_BOOK", twohanded: false }, 8, 0);

    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.offhand?.itemId).toBe("T8_OFFHAND_BOOK");
  });

  it("ACM-009: setTier swaps the itemId and tier without resetting spells", () => {
    const { setItem, setSpell, setTier } = selectActions(useBuildStore.getState());
    setItem("mainhand", { uniquename: "T4_MAIN_SWORD", twohanded: false }, 4, 0);
    setSpell("mainhand", "q", "SWORD_Q_SPELL");
    setTier("mainhand", 8, "T8_MAIN_SWORD");

    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.mainhand).toMatchObject({ itemId: "T8_MAIN_SWORD", tier: 8 });
    expect(build.slots.mainhand?.spells.q).toBe("SWORD_Q_SPELL");
  });

  it("ACM-009: setTier on an empty slot is a no-op", () => {
    const { setTier } = selectActions(useBuildStore.getState());
    setTier("mainhand", 8, "T8_MAIN_SWORD");
    expect(selectBuild(useBuildStore.getState()).slots.mainhand).toBeNull();
  });

  it("re-equipping a slot resets its spells", () => {
    const { setItem, setSpell } = selectActions(useBuildStore.getState());
    setItem("mainhand", { uniquename: "T8_MAIN_SWORD", twohanded: false }, 8, 0);
    setSpell("mainhand", "q", "SWORD_Q_SPELL");
    setItem("mainhand", { uniquename: "T8_MAIN_AXE", twohanded: false }, 8, 0);

    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.mainhand?.itemId).toBe("T8_MAIN_AXE");
    expect(build.slots.mainhand?.spells).toEqual({ q: null, w: null, e: null, passive: null });
  });

  it("AC #4: getState() build slice is JSON-serializable with a lossless round-trip", () => {
    const { setItem, setSpell, setName, setRole } = selectActions(useBuildStore.getState());
    setName("Bruiser de frontline");
    setRole("Tank");
    setItem("mainhand", { uniquename: "T8_MAIN_SWORD", twohanded: false }, 8, 2);
    setSpell("mainhand", "q", "SWORD_Q_SPELL");

    const build = selectBuild(useBuildStore.getState());
    const roundTripped = JSON.parse(JSON.stringify(build));

    expect(roundTripped).toEqual(build);
    expect(JSON.stringify(build)).not.toContain("undefined");

    function assertNoFunctionsOrUndefined(value: unknown): void {
      if (value === undefined) throw new Error("found undefined in build state");
      if (typeof value === "function") throw new Error("found function in build state");
      if (value !== null && typeof value === "object") {
        for (const v of Object.values(value)) assertNoFunctionsOrUndefined(v);
      }
    }
    assertNoFunctionsOrUndefined(build);
  });

  it("clearSlot empties a filled slot", () => {
    const { setItem, clearSlot } = selectActions(useBuildStore.getState());
    setItem("cape", { uniquename: "T8_CAPE", twohanded: false }, 8, 0);
    clearSlot("cape");
    expect(selectBuild(useBuildStore.getState()).slots.cape).toBeNull();
  });
});
