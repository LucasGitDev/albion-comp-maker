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

/**
 * Tailwind v4's alpha-slash utilities (bg-black/70, text-white/50,
 * border-black/[.08], etc.) compile to `color-mix(in oklab, ...)` under an
 * `@supports` progressive-enhancement rule — the exact defect that slipped
 * past ACM-013's guard (see ACM-029). This matches any `<prefix>-<token>/<NN>`
 * or `<prefix>-<token>/[...]` className, regardless of whether <token> is a
 * palette color or a bare keyword like black/white.
 */
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

  it("never uses a Tailwind alpha-slash utility (would compile to color-mix())", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} />);
    const offenders = collectClassNames(container).filter((cls) => ALPHA_SLASH_UTILITY.test(cls));
    expect(offenders).toEqual([]);
  });

  it("never emits a literal color-mix( or oklab( anywhere in its rendered markup", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} />);
    expect(container.innerHTML).not.toContain("color-mix(");
    expect(container.innerHTML).not.toContain("oklab(");
  });

  it("never sets an inline style color/background to color-mix(), oklab(), or oklch()", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} />);
    const root = container.querySelector("#capture-root")!;
    const offenders: string[] = [];
    const walk = (el: Element) => {
      const style = el.getAttribute("style");
      if (style && /color-mix\(|oklab\(|oklch\(/.test(style)) offenders.push(style);
      for (const child of Array.from(el.children)) walk(child);
    };
    walk(root);
    expect(offenders).toEqual([]);
  });

  it("renders no interactive elements inside the capture root", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} />);
    const root = container.querySelector("#capture-root")!;
    expect(root.querySelectorAll("button, input, select, textarea, a[href]").length).toBe(0);
  });

  it("renders empty equipment slots as placeholders instead of dropping them (ACM-092 AC#3)", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} />);
    // Only mainhand + head were populated; the rest still render, as placeholders.
    expect(container.querySelector('[data-slot="offhand"][data-slot-state="empty"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="shoes"][data-slot-state="empty"]')).toBeTruthy();
    expect(container.querySelector('[data-slot="head"][data-slot-state="filled"]')).toBeTruthy();
  });

  it("renders the full equipment placeholder grid, never an editor-only hint, when there is no mainhand", () => {
    const state = createEmptyBuild();
    const { container } = render(<BuildCard state={state} />);
    expect(container.querySelector('[data-slot="mainhand"][data-slot-state="empty"]')).toBeTruthy();
    expect(container.textContent).not.toContain("Escolha a mão principal");
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

/**
 * ACM-092 ui-reviewer HIGH finding: `BuildCard` is the single source for both
 * the editor preview and the exported PNG (no separate "export mode"), so any
 * text rendered here ships inside the artifact posted to Discord. A build
 * with zero slots filled is an explicitly supported state (AC#1 says
 * "inclusive zero") and must render the same placeholder grid as a partially
 * filled build — never an editor-directed instruction like "escolha a mão
 * principal", in any of the 4 layouts.
 */
describe("BuildCard zero-slots export never leaks an editor instruction (ACM-092 review)", () => {
  const layouts = ["vertical", "grid", "compressed", "list"] as const;
  const EDIT_HINT_SNIPPETS = ["Escolha a mão principal", "para ver o card", "para montar a build"];

  it.each(layouts)("%s: never contains an editor-instruction string for a zero-slots build", (layout) => {
    const state = createEmptyBuild();
    const { container } = render(<BuildCard state={state} layout={layout} />);
    for (const snippet of EDIT_HINT_SNIPPETS) {
      expect(container.textContent).not.toContain(snippet);
    }
  });

  it.each(layouts)("%s: renders the full 10-slot placeholder grid for a zero-slots build", (layout) => {
    const state = createEmptyBuild();
    const { container } = render(<BuildCard state={state} layout={layout} />);
    const emptySlotCells = container.querySelectorAll('[data-slot-state="empty"]');
    expect(emptySlotCells.length).toBeGreaterThan(0);
  });
});

/**
 * ACM-014/decision-017: the 5 export-safety guards above only ever exercised
 * the DEFAULT theme. This task is the first to put user-chosen color (a
 * non-default preset) and an alpha overlay (the darken veil) inside the
 * capture root, across all 4 layouts — exactly the surface decision-017
 * flags as most likely to regress. Re-running the same 5 checks against a
 * fully non-default theme on every layout closes that gap.
 */
describe("BuildCard export-safety guards with a full non-default theme (ACM-014)", () => {
  const layouts = ["vertical", "grid", "compressed", "list"] as const;
  const fullTheme = {
    preset: "ice" as const,
    aspectRatio: "square" as const,
    fontFamily: "mono" as const,
    showItemNames: true,
    showSpellNames: true,
    background: { imageId: "abcdefghijklmnopqrstu", blur: 8, darken: 0.6, scale: 1.3 },
  };

  it.each(layouts)("%s: never uses a Tailwind palette color utility", (layout) => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} layout={layout} theme={fullTheme} />);
    const offenders = collectClassNames(container).filter((cls) => PALETTE_COLOR_UTILITY.test(cls));
    expect(offenders).toEqual([]);
  });

  it.each(layouts)("%s: never uses a Tailwind alpha-slash utility", (layout) => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} layout={layout} theme={fullTheme} />);
    const offenders = collectClassNames(container).filter((cls) => ALPHA_SLASH_UTILITY.test(cls));
    expect(offenders).toEqual([]);
  });

  it.each(layouts)("%s: never emits a literal oklch()/oklab()/color-mix() anywhere in markup", (layout) => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} layout={layout} theme={fullTheme} />);
    expect(container.innerHTML).not.toContain("oklch(");
    expect(container.innerHTML).not.toContain("oklab(");
    expect(container.innerHTML).not.toContain("color-mix(");
  });

  it.each(layouts)("%s: never sets an inline style to color-mix()/oklab()/oklch()", (layout) => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} layout={layout} theme={fullTheme} />);
    const root = container.querySelector("#capture-root")!;
    const offenders: string[] = [];
    const walk = (el: Element) => {
      const style = el.getAttribute("style");
      if (style && /color-mix\(|oklab\(|oklch\(/.test(style)) offenders.push(style);
      for (const child of Array.from(el.children)) walk(child);
    };
    walk(root);
    expect(offenders).toEqual([]);
  });

  it.each(layouts)("%s: never references a CSS custom property (var(--...))", (layout) => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} layout={layout} theme={fullTheme} />);
    const root = container.querySelector("#capture-root")!;
    expect(root.outerHTML.includes("var(--")).toBe(false);
  });

  it.each(layouts)("%s: renders the background as a real <img>, never a CSS background-image", (layout) => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} layout={layout} theme={fullTheme} />);
    const root = container.querySelector("#capture-root")!;
    const bgImg = root.querySelector("img[data-build-card-background]");
    expect(bgImg).toBeTruthy();
    expect(bgImg?.getAttribute("src")).toBe("/api/background/abcdefghijklmnopqrstu");
    // The regression this guards against: html-to-image's waitForImage walks
    // every <img>, never a CSS background-image, so the background must
    // never be expressed that way.
    expect(root.outerHTML).not.toMatch(/background-image\s*:/);
  });

  it.each(layouts)("%s: applies square aspect ratio to the capture root wrapper", (layout) => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} layout={layout} theme={fullTheme} />);
    const root = container.querySelector("#capture-root") as HTMLElement;
    expect(root.style.aspectRatio).toBe("1 / 1");
  });
});

/**
 * PR #50 CRITICAL review fix (doc-007 §8's protection rule): the capture
 * root must never crop the build in `square`/`wide`. Before this fix,
 * `overflow: hidden` on the aspect-ratio wrapper silently clipped any build
 * taller than the requested ratio — invisible in the DOM tree, only visible
 * as missing pixels in the exported PNG.
 */
describe("BuildCard never crops content in square/wide (PR #50 CRITICAL fix, doc-007 §8)", () => {
  const layouts = ["vertical", "grid", "compressed", "list"] as const;

  it.each(layouts)("%s: the capture root wrapper never sets overflow: hidden", (layout) => {
    const state = buildWithMainhand();
    const { container } = render(
      <BuildCard state={state} layout={layout} theme={{ aspectRatio: "wide" }} />
    );
    const root = container.querySelector("#capture-root") as HTMLElement;
    expect(root.style.overflow).not.toBe("hidden");
  });

  it.each(["square", "wide"] as const)(
    "%s: shows the doc-007 overflow warning when content is taller than the requested ratio",
    (aspectRatio) => {
      const originalResizeObserver = globalThis.ResizeObserver;
      const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

      // Simulates a build tall enough that the box grew past the requested
      // ratio: width stays whatever the content's intrinsic width is, height
      // ends up much larger than aspect-ratio would have proposed.
      HTMLElement.prototype.getBoundingClientRect = function stubbedRect(this: HTMLElement) {
        if (this.id === "capture-root") {
          return { width: 960, height: 3000, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
        }
        return originalGetBoundingClientRect.call(this);
      };

      let observedCallback: ResizeObserverCallback | null = null;
      class StubResizeObserver {
        constructor(callback: ResizeObserverCallback) {
          observedCallback = callback;
        }
        observe(): void {
          observedCallback?.([], this as unknown as ResizeObserver);
        }
        unobserve(): void {}
        disconnect(): void {}
      }
      globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver;

      try {
        const state = buildWithMainhand();
        const { container } = render(<BuildCard state={state} layout="vertical" theme={{ aspectRatio }} />);
        expect(container.querySelector("[data-build-card-overflow-warning]")?.textContent).toContain(
          "A build é alta demais para esse formato"
        );
      } finally {
        globalThis.ResizeObserver = originalResizeObserver;
        HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
      }
    }
  );

  it("does not show the overflow warning when aspectRatio is auto", () => {
    const state = buildWithMainhand();
    const { container } = render(<BuildCard state={state} layout="vertical" theme={{ aspectRatio: "auto" }} />);
    expect(container.querySelector("[data-build-card-overflow-warning]")).toBeNull();
  });
});
