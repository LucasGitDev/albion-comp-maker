import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BuildCard } from "@/components/build-card";
import { createEmptyBuild, type BuildState } from "@/types/build";

function buildWithMainhand(): BuildState {
  const state = createEmptyBuild();
  state.name = "Bruiser de Frontline";
  state.role = "Tank";
  state.accent = "#4a8fd4";
  state.slots.mainhand = {
    itemId: "T8_MAIN_HAMMER",
    tier: 8,
    enchant: 1,
    spells: { q: "HAMMER_Q", w: "HAMMER_W", e: null, passive: null },
    twohanded: true,
  };
  state.slots.head = {
    itemId: "T8_HEAD_PLATE_SET1",
    tier: 8,
    enchant: 0,
    spells: { q: null, w: "HEAD_W", e: null, passive: null },
    twohanded: false,
  };
  state.swaps = [{ id: "swap-1", label: "Martelo → Machado · Bridge fight", slots: {} }];
  return state;
}

/**
 * Tailwind v4's default palette utilities (bg-blue-500, text-red-600, etc.)
 * compile to oklch(), which html-to-image (decision-007) cannot parse. This
 * scans every className string in the rendered tree for that family of
 * utilities — the mechanical proxy for "no oklch() in the capture root".
 */
const PALETTE_COLOR_UTILITY = new RegExp(
  String.raw`\b(?:bg|text|border|ring|from|to|via|outline|shadow|decoration|accent|caret|fill|stroke|divide)-` +
    String.raw`(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b`
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

describe("BuildCard", () => {
  it("renders from BuildState props alone (no store, no context)", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} />);
    expect(container.querySelector("#capture-root")).toBeTruthy();
    expect(container.textContent).toContain("Bruiser de Frontline");
  });

  it("exposes a single #capture-root as the export capture node", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} />);
    const roots = container.querySelectorAll("#capture-root");
    expect(roots.length).toBe(1);
  });

  it("never uses a Tailwind palette color utility (would compile to oklch())", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} />);
    const offenders = collectClassNames(container).filter((cls) => PALETTE_COLOR_UTILITY.test(cls));
    expect(offenders).toEqual([]);
  });

  it("never emits a literal oklch() anywhere in its rendered markup", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} />);
    expect(container.innerHTML).not.toContain("oklch(");
  });

  it("renders no interactive elements inside the capture root", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} />);
    const root = container.querySelector("#capture-root")!;
    expect(root.querySelectorAll("button, input, select, textarea, a[href]").length).toBe(0);
  });

  it("does not render empty equipment slots in the exported card", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} />);
    // Only mainhand + head were populated; offhand/shoes/etc. must not appear as tiles.
    expect(container.querySelector('[data-slot="offhand"]')).toBeNull();
    expect(container.querySelector('[data-slot="shoes"]')).toBeNull();
    expect(container.querySelector('[data-slot="head"]')).toBeTruthy();
  });

  it("renders the empty-build placeholder copy when there is no mainhand", () => {
    const state = createEmptyBuild();
    const { container } = render(<BuildCard state={state} />);
    expect(container.textContent).toContain("Escolha a mão principal para ver o card");
  });

  it("renders swaps when present", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} />);
    expect(container.textContent).toContain("Martelo → Machado · Bridge fight");
  });

  it("produces identical output for two renders of the same state (byte-identical hover vs no-hover proxy)", () => {
    const state = buildWithMainhand();
    const first = render(<BuildCard state={state} />);
    const second = render(<BuildCard state={state} />);
    expect(second.container.innerHTML).toBe(first.container.innerHTML);
  });

  it("supports the grid layout as a narrower comp column of the same BuildState", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} layout="grid" />);
    const root = container.querySelector("#capture-root");
    expect(root?.getAttribute("data-layout")).toBe("grid");
    expect(container.textContent).toContain("Bruiser de Frontline");
  });
});
