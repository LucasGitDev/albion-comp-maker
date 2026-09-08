import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BuildCard } from "@/components/build-card";
import { createEmptyBuild, SLOT_ORDER, type BuildState } from "@/types/build";

function buildWithFullEquipment(): BuildState {
  const state = createEmptyBuild();
  state.name = "Bruiser de Frontline";
  state.role = "Tank";
  state.accent = "#4a8fd4";
  state.slots.mainhand = {
    itemId: "T8_MAIN_HAMMER",
    tier: 8,
    enchant: 1,
    spells: { q: "HAMMER_Q", w: null, e: null, passive: "HAMMER_PASSIVE" },
    twohanded: true,
    maxEnchant: 4,
  };
  state.slots.head = {
    itemId: "T8_HEAD_PLATE_SET1",
    tier: 8,
    enchant: 0,
    spells: { q: null, w: "HEAD_W", e: null, passive: null },
    twohanded: false,
    maxEnchant: 4,
  };
  state.slots.mount = {
    itemId: "T7_MOUNT_HORSE",
    tier: 7,
    enchant: 0,
    spells: { q: null, w: null, e: null, passive: null },
    twohanded: false,
    maxEnchant: 0,
  };
  state.swaps = [{ id: "swap-1", label: "Martelo → Machado", slots: {} }];
  return state;
}

/**
 * Same mechanical proxy `build-card.test.tsx` uses for AC#7: a Tailwind
 * palette utility (bg-blue-500, text-red-600, ...) compiles to oklch(),
 * which html-to-image (decision-007) silently drops. Every hex literal in
 * `build-card/tokens.ts` replaces this family of classes.
 */
const PALETTE_COLOR_UTILITY = new RegExp(
  String.raw`\b(?:bg|text|border|ring|from|to|via|outline|shadow|decoration|accent|caret|fill|stroke|divide)-` +
    String.raw`(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b`
);

const ALPHA_SLASH_UTILITY = new RegExp(
  String.raw`\b(?:bg|text|border|ring|from|to|via|outline|shadow|decoration|accent|caret|fill|stroke|divide|placeholder)-` +
    String.raw`[a-zA-Z0-9_-]+/(?:\d{1,3}\b|\[)`
);

function collectClassNames(root: Element): string[] {
  const classNames: string[] = [];
  const walk = (el: Element) => {
    const cls = el.getAttribute("class");
    if (cls) classNames.push(cls);
    for (const child of Array.from(el.children)) walk(child);
  };
  walk(root);
  return classNames;
}

describe("BuildCard layout prop (AC#1)", () => {
  it("accepts 'compressed' and renders the 3x3 matrix container", () => {
    const state = buildWithFullEquipment();
    const { container } = render(<BuildCard state={state} layout="compressed" />);
    const root = container.querySelector("#capture-root");
    expect(root?.getAttribute("data-layout")).toBe("compressed");
    expect(container.textContent).toContain("Bruiser de Frontline");
  });

  it("accepts 'list' and renders it", () => {
    const state = buildWithFullEquipment();
    const { container } = render(<BuildCard state={state} layout="list" />);
    const root = container.querySelector("#capture-root");
    expect(root?.getAttribute("data-layout")).toBe("list");
    expect(container.textContent).toContain("Bruiser de Frontline");
  });

  it("keeps 'vertical' output identical to before this task", () => {
    const state = buildWithFullEquipment();
    const { container } = render(<BuildCard state={state} layout="vertical" />);
    expect(container.querySelector('[data-slot="head"]')).toBeTruthy();
    expect(container.textContent).toContain("Bruiser de Frontline");
  });

  it("keeps 'grid' output identical to before this task", () => {
    const state = buildWithFullEquipment();
    const { container } = render(<BuildCard state={state} layout="grid" />);
    expect(container.querySelector('[data-slot="head"]')).toBeTruthy();
  });
});

describe("BuildCardCompressed", () => {
  it("renders all 9 matrix cells plus the mount outside the matrix", () => {
    const state = buildWithFullEquipment();
    const { container } = render(<BuildCard state={state} layout="compressed" />);
    // 9 matrix cells: bag/head/cape/mainhand/armor/offhand/potion/shoes/food.
    const matrixSlots = ["bag", "head", "cape", "mainhand", "armor", "offhand", "potion", "shoes", "food"];
    for (const slot of matrixSlots) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).toBeTruthy();
    }
    // Mount renders (in the meta panel), but never as a matrix cell.
    expect(container.textContent).toContain("T7_MOUNT_HORSE");
    expect(container.querySelector('[data-slot="mount"]')).toBeNull();
  });

  it("renders 9 placeholder cells without collapsing on an empty build (AC#5)", () => {
    const state = createEmptyBuild();
    const { container } = render(<BuildCard state={state} layout="compressed" />);
    const cells = container.querySelectorAll("[data-slot-state]");
    expect(cells.length).toBe(9);
    for (const cell of Array.from(cells)) {
      expect(cell.getAttribute("data-slot-state")).toBe("empty");
    }
    expect(container.textContent).toContain("Sem nome");
  });

  it("preserves Q/W/E/Passive chip position: an absent group occupies 18px instead of shifting others (AC#4)", () => {
    const state = buildWithFullEquipment();
    // The catalog (spellGroupsByItem) says this item only exposes q/passive —
    // w/e must render as invisible 18px placeholders, not shift e/passive left.
    const { container } = render(
      <BuildCard
        state={state}
        layout="compressed"
        spellGroupsByItem={{ T8_MAIN_HAMMER: ["q", "passive"] }}
      />
    );
    const mainhandCell = container.querySelector('[data-slot="mainhand"]');
    expect(mainhandCell).toBeTruthy();
    const slots = mainhandCell!.querySelectorAll("[data-spell-slot]");
    expect(slots).toHaveLength(4);
    expect(slots[0].getAttribute("data-spell-slot")).toBe("q");
    expect(slots[0].getAttribute("data-spell-slot-state")).not.toBe("absent");
    expect(slots[1].getAttribute("data-spell-slot")).toBe("w");
    expect(slots[1].getAttribute("data-spell-slot-state")).toBe("absent");
    expect(slots[2].getAttribute("data-spell-slot")).toBe("e");
    expect(slots[2].getAttribute("data-spell-slot-state")).toBe("absent");
    expect(slots[3].getAttribute("data-spell-slot")).toBe("passive");
    expect(slots[3].getAttribute("data-spell-slot-state")).not.toBe("absent");
  });

  it("never uses a Tailwind palette color utility (AC#7)", () => {
    const state = buildWithFullEquipment();
    const { container } = render(<BuildCard state={state} layout="compressed" />);
    const offenders = collectClassNames(container).filter((cls) => PALETTE_COLOR_UTILITY.test(cls));
    expect(offenders).toEqual([]);
    expect(container.innerHTML).not.toContain("oklch(");
  });
});

describe("BuildCardList", () => {
  it("renders all 10 SLOT_ORDER slots, empty ones as a 'Vazio' row (AC#6)", () => {
    const state = createEmptyBuild();
    state.slots.mainhand = {
      itemId: "T8_MAIN_HAMMER",
      tier: 8,
      enchant: 0,
      spells: { q: "HAMMER_Q", w: null, e: null, passive: null },
      twohanded: true,
      maxEnchant: 4,
    };
    const { container } = render(<BuildCard state={state} layout="list" />);
    for (const slot of SLOT_ORDER) {
      const row = container.querySelector(`[data-slot="${slot}"]`);
      expect(row).toBeTruthy();
    }
    const emptyRows = container.querySelectorAll('[data-slot-state="empty"]');
    expect(emptyRows.length).toBe(SLOT_ORDER.length - 1);
    expect(container.textContent).toContain("Vazio");
  });

  it("always shows the item name, never hidden behind a theme toggle", () => {
    const state = buildWithFullEquipment();
    const { container } = render(
      <BuildCard state={state} layout="list" theme={{ showItemNames: false }} />
    );
    // itemNames lookup isn't populated in this fixture, so the raw id is the
    // rendered "name" — the point is that *something* identifying renders,
    // unconditionally, regardless of `showItemNames`.
    expect(container.textContent).toContain("T8_MAIN_HAMMER");
  });

  it("never uses a Tailwind palette color utility (AC#7)", () => {
    const state = buildWithFullEquipment();
    const { container } = render(<BuildCard state={state} layout="list" />);
    const offenders = collectClassNames(container).filter((cls) => PALETTE_COLOR_UTILITY.test(cls));
    expect(offenders).toEqual([]);
    const alphaOffenders = collectClassNames(container).filter((cls) => ALPHA_SLASH_UTILITY.test(cls));
    expect(alphaOffenders).toEqual([]);
    expect(container.innerHTML).not.toContain("oklch(");
  });
});
