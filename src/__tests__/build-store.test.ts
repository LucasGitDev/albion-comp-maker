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
    setItem("head", { uniquename: "T8_HEAD_PLATE_SET1", twohanded: false, maxEnchant: 4 }, 8, 1);

    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.head).toEqual({
      itemId: "T8_HEAD_PLATE_SET1",
      tier: 8,
      enchant: 1,
      spells: { q: null, w: null, e: null, passive: null },
      twohanded: false,
      maxEnchant: 4,
    });
  });

  it("AC #3: selecting a spell updates the store", () => {
    const { setItem, setSpell } = selectActions(useBuildStore.getState());
    setItem("mainhand", { uniquename: "T8_MAIN_SWORD", twohanded: false, maxEnchant: 4 }, 8, 0);
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
    setItem("offhand", { uniquename: "T8_OFFHAND_BOOK", twohanded: false, maxEnchant: 4 }, 8, 0);
    setItem("mainhand", { uniquename: "T8_2H_HAMMER", twohanded: true, maxEnchant: 4 }, 8, 0);

    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.offhand).toBeNull();
  });

  it("setting an offhand item while mainhand is already two-handed is a no-op (store-level lock)", () => {
    const { setItem } = selectActions(useBuildStore.getState());
    setItem("mainhand", { uniquename: "T8_2H_HAMMER", twohanded: true, maxEnchant: 4 }, 8, 0);
    setItem("offhand", { uniquename: "T8_OFFHAND_BOOK", twohanded: false, maxEnchant: 4 }, 8, 0);

    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.offhand).toBeNull();
  });

  it("clearing the two-handed mainhand does not retroactively unlock offhand from a stale call", () => {
    const { setItem, clearSlot } = selectActions(useBuildStore.getState());
    setItem("mainhand", { uniquename: "T8_2H_HAMMER", twohanded: true, maxEnchant: 4 }, 8, 0);
    clearSlot("mainhand");
    setItem("offhand", { uniquename: "T8_OFFHAND_BOOK", twohanded: false, maxEnchant: 4 }, 8, 0);

    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.offhand?.itemId).toBe("T8_OFFHAND_BOOK");
  });

  it("ACM-009: setTier swaps the itemId and tier without resetting spells", () => {
    const { setItem, setSpell, setTier } = selectActions(useBuildStore.getState());
    setItem("mainhand", { uniquename: "T4_MAIN_SWORD", twohanded: false, maxEnchant: 4 }, 4, 0);
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
    setItem("mainhand", { uniquename: "T8_MAIN_SWORD", twohanded: false, maxEnchant: 4 }, 8, 0);
    setSpell("mainhand", "q", "SWORD_Q_SPELL");
    setItem("mainhand", { uniquename: "T8_MAIN_AXE", twohanded: false, maxEnchant: 4 }, 8, 0);

    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.mainhand?.itemId).toBe("T8_MAIN_AXE");
    expect(build.slots.mainhand?.spells).toEqual({ q: null, w: null, e: null, passive: null });
  });

  it("AC #4: getState() build slice is JSON-serializable with a lossless round-trip", () => {
    const { setItem, setSpell, setName, setRole } = selectActions(useBuildStore.getState());
    setName("Bruiser de frontline");
    setRole("Tank");
    setItem("mainhand", { uniquename: "T8_MAIN_SWORD", twohanded: false, maxEnchant: 4 }, 8, 2);
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

  it("ACM-031: setEnchant updates the enchant level without touching tier/spells", () => {
    const { setItem, setSpell, setEnchant } = selectActions(useBuildStore.getState());
    setItem("head", { uniquename: "T4_HEAD_PLATE_SET1", twohanded: false, maxEnchant: 4 }, 4, 0);
    setSpell("head", "q", "ENERGY_BARRIER");
    setEnchant("head", 3);

    const build = selectBuild(useBuildStore.getState());
    expect(build.slots.head).toMatchObject({ itemId: "T4_HEAD_PLATE_SET1", tier: 4, enchant: 3 });
    expect(build.slots.head?.spells.q).toBe("ENERGY_BARRIER");
  });

  it("ACM-031: setEnchant on an empty slot is a no-op", () => {
    const { setEnchant } = selectActions(useBuildStore.getState());
    setEnchant("head", 2);
    expect(selectBuild(useBuildStore.getState()).slots.head).toBeNull();
  });

  it("ACM-031: setEnchant clamps out-of-range values to 0..4", () => {
    const { setItem, setEnchant } = selectActions(useBuildStore.getState());
    setItem("head", { uniquename: "T4_HEAD_PLATE_SET1", twohanded: false, maxEnchant: 4 }, 4, 0);

    setEnchant("head", 99);
    expect(selectBuild(useBuildStore.getState()).slots.head?.enchant).toBe(4);

    setEnchant("head", -5);
    expect(selectBuild(useBuildStore.getState()).slots.head?.enchant).toBe(0);
  });

  it("ACM-031 review fix: setEnchant cannot exceed the equipped item's real maxEnchant (store-level, not just UI)", () => {
    const { setItem, setEnchant } = selectActions(useBuildStore.getState());
    // T1_OFF_SHIELD is a real maxEnchant-0 item (ao-corpus.json fixture, decision-011).
    setItem("offhand", { uniquename: "T1_OFF_SHIELD", twohanded: false, maxEnchant: 0 }, 1, 0);

    setEnchant("offhand", 3);

    expect(selectBuild(useBuildStore.getState()).slots.offhand?.enchant).toBe(0);
  });

  it("clearSlot empties a filled slot", () => {
    const { setItem, clearSlot } = selectActions(useBuildStore.getState());
    setItem("cape", { uniquename: "T8_CAPE", twohanded: false, maxEnchant: 4 }, 8, 0);
    clearSlot("cape");
    expect(selectBuild(useBuildStore.getState()).slots.cape).toBeNull();
  });
});

describe("build store — swaps (ACM-012, RF-3)", () => {
  it("addSwap appends a new swap with a non-empty label and no item yet", () => {
    const { addSwap } = selectActions(useBuildStore.getState());
    addSwap();

    const build = selectBuild(useBuildStore.getState());
    expect(build.swaps).toHaveLength(1);
    expect(build.swaps[0].label.length).toBeGreaterThan(0);
    expect(build.swaps[0].id).toBeTruthy();
  });

  it("removeSwap removes exactly the targeted swap", () => {
    const { addSwap, removeSwap } = selectActions(useBuildStore.getState());
    addSwap();
    addSwap();
    const [first, second] = selectBuild(useBuildStore.getState()).swaps;

    removeSwap(first.id);

    const build = selectBuild(useBuildStore.getState());
    expect(build.swaps).toHaveLength(1);
    expect(build.swaps[0].id).toBe(second.id);
  });

  it("setSwapLabel updates only the targeted swap's label", () => {
    const { addSwap, setSwapLabel } = selectActions(useBuildStore.getState());
    addSwap();
    addSwap();
    const [first, second] = selectBuild(useBuildStore.getState()).swaps;

    setSwapLabel(first.id, "Bridge fight");

    const build = selectBuild(useBuildStore.getState());
    expect(build.swaps.find((s) => s.id === first.id)?.label).toBe("Bridge fight");
    expect(build.swaps.find((s) => s.id === second.id)?.label).toBe(second.label);
  });

  it("setSwapLabel never persists an empty string (swapSchema.label is min(1), ACM-049)", () => {
    const { addSwap, setSwapLabel } = selectActions(useBuildStore.getState());
    addSwap();
    const [swap] = selectBuild(useBuildStore.getState()).swaps;

    setSwapLabel(swap.id, "");

    expect(selectBuild(useBuildStore.getState()).swaps[0].label.length).toBeGreaterThan(0);
  });

  it("setSwapSlot points the swap at a new slot, clearing any previously equipped item", () => {
    const { addSwap, setSwapItem, setSwapSlot } = selectActions(useBuildStore.getState());
    addSwap();
    const [swap] = selectBuild(useBuildStore.getState()).swaps;
    setSwapItem(swap.id, "mainhand", { uniquename: "T8_MAIN_SWORD", twohanded: false, maxEnchant: 4 }, 8, 0);

    setSwapSlot(swap.id, "cape");

    const updated = selectBuild(useBuildStore.getState()).swaps[0];
    expect(Object.keys(updated.slots)).toEqual(["cape"]);
    expect(updated.slots.cape).toBeNull();
  });

  it("setSwapItem equips an item into the swap's slot", () => {
    const { addSwap, setSwapItem } = selectActions(useBuildStore.getState());
    addSwap();
    const [swap] = selectBuild(useBuildStore.getState()).swaps;

    setSwapItem(swap.id, "mainhand", { uniquename: "T8_MAIN_AXE", twohanded: true, maxEnchant: 4 }, 8, 2);

    const updated = selectBuild(useBuildStore.getState()).swaps[0];
    expect(updated.slots.mainhand).toEqual({
      itemId: "T8_MAIN_AXE",
      tier: 8,
      enchant: 2,
      spells: { q: null, w: null, e: null, passive: null },
      twohanded: true,
      maxEnchant: 4,
    });
  });

  it("moveSwap('up')/('down') reorders swaps and is a no-op at either boundary", () => {
    const { addSwap, moveSwap } = selectActions(useBuildStore.getState());
    addSwap();
    addSwap();
    addSwap();
    const [a, b, c] = selectBuild(useBuildStore.getState()).swaps;

    // Moving the first item down (boundary case: index 0 -> "up" is a no-op first).
    moveSwap(a.id, "up");
    expect(selectBuild(useBuildStore.getState()).swaps.map((s) => s.id)).toEqual([a.id, b.id, c.id]);

    moveSwap(a.id, "down");
    expect(selectBuild(useBuildStore.getState()).swaps.map((s) => s.id)).toEqual([b.id, a.id, c.id]);

    // Moving the last item up.
    moveSwap(c.id, "down");
    expect(selectBuild(useBuildStore.getState()).swaps.map((s) => s.id)).toEqual([b.id, a.id, c.id]);

    moveSwap(c.id, "up");
    expect(selectBuild(useBuildStore.getState()).swaps.map((s) => s.id)).toEqual([b.id, c.id, a.id]);

    // Reordering never produces duplicate or gapped positions.
    const ids = selectBuild(useBuildStore.getState()).swaps.map((s) => s.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("setSwapSpell updates only the targeted group on the swap's equipped item", () => {
    const { addSwap, setSwapItem, setSwapSpell } = selectActions(useBuildStore.getState());
    addSwap();
    const [swap] = selectBuild(useBuildStore.getState()).swaps;
    setSwapItem(swap.id, "mainhand", { uniquename: "T8_MAIN_SWORD", twohanded: false, maxEnchant: 4 }, 8, 0);

    setSwapSpell(swap.id, "mainhand", "q", "SWORD_Q_SPELL");

    const updated = selectBuild(useBuildStore.getState()).swaps[0];
    expect(updated.slots.mainhand?.spells.q).toBe("SWORD_Q_SPELL");
    expect(updated.slots.mainhand?.spells.w).toBeNull();
  });

  it("enforces the swap cap at the store level, not only in the UI (mirrors buildStateSchema's swaps.max(20))", () => {
    const { addSwap } = selectActions(useBuildStore.getState());
    for (let i = 0; i < 25; i++) {
      addSwap();
    }

    expect(selectBuild(useBuildStore.getState()).swaps).toHaveLength(20);
  });
});
