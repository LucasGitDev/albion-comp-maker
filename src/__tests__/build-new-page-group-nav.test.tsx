import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AOItem } from "@/data/ao-data.d";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

vi.mock("@/components/editor/use-item-catalogue", () => {
  const items: AOItem[] = [
    {
      uniquename: "T4_HEAD_PLATE_SET1",
      slot: "head",
      localizedNames: { "EN-US": "Soldier Helmet" },
      spells: [],
      twohanded: false,
      maxEnchant: 4,
    },
  ];
  return { useItemCatalogue: () => ({ items, loading: false }) };
});

const { mockSaveBuild } = vi.hoisted(() => ({
  mockSaveBuild: vi.fn(),
}));

vi.mock("@/actions/builds", () => ({
  saveBuild: mockSaveBuild,
}));

import NewBuildPage from "@/app/(editor)/build/new/page";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { useBuildStore } from "@/store/build-store";

function renderPage() {
  return render(
    <LocaleProvider initialLocale="en-US">
      <NewBuildPage />
    </LocaleProvider>
  );
}

beforeEach(() => {
  useBuildStore.getState().actions.reset();
  mockSaveBuild.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("/build/new — mobile group-nav strip (ACM-041)", () => {
  it("the global counter denominator excludes a locked offhand on a two-handed build", () => {
    useBuildStore.getState().actions.setItem(
      "mainhand",
      { uniquename: "T8_2H_HAMMER", twohanded: true, maxEnchant: 4 },
      8,
      0
    );
    renderPage();
    // 10 slots total minus the locked offhand = 9 reachable; only mainhand
    // is filled, so 1/9 — never 1/10 (unreachable) and never 0/9 (offhand
    // silently dropped from the numerator too).
    expect(screen.getByText("1/9")).toBeInTheDocument();
  });

  it("the Armas chip denominator drops to 1 (not 2) when offhand is locked", () => {
    useBuildStore.getState().actions.setItem(
      "mainhand",
      { uniquename: "T8_2H_HAMMER", twohanded: true, maxEnchant: 4 },
      8,
      0
    );
    renderPage();
    expect(screen.getByRole("link", { name: /armas 1 de 1/i })).toBeInTheDocument();
  });

  it("clicking a group chip moves focus to that group's heading, not <body>", () => {
    renderPage();
    const chip = screen.getByRole("link", { name: /consumíveis 0 de 2/i });
    fireEvent.click(chip);
    const heading = document.getElementById("slot-group-consumiveis");
    expect(document.activeElement).toBe(heading);
    expect(document.activeElement).not.toBe(document.body);
  });

  it("the item picker's focus trap still works with the group-nav strip mounted", async () => {
    renderPage();
    // Scoped to `[data-testid="slot-grid"]` so this doesn't accidentally match
    // the read-only build-card preview tile, which shares the same
    // `data-slot`/`data-slot-state` attributes (ACM-092 always renders the
    // full placeholder grid there too, even for a zero-slots build) but never
    // renders a clickable slot of any kind.
    const slotGrid = document.querySelector('[data-testid="slot-grid"]')!;
    const headSlot = slotGrid.querySelector('[data-slot="head"][data-slot-state="empty"]')!;
    fireEvent.click(headSlot);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const dialog = screen.getByRole("dialog");
    const input = screen.getByRole("combobox");
    input.focus();
    // A query with no matches so Tab can't commit a highlighted result
    // (ACM-046) — this isolates the trap itself from the "Tab commits"
    // behavior, which intentionally closes the dialog and is exercised
    // elsewhere (slot-picker-popover-a11y.test.tsx).
    fireEvent.change(input, { target: { value: "no-such-item-xyz" } });
    // The result list updates on a 120ms debounce; wait for it so `Tab`
    // below truly has no highlighted result to commit.
    await waitFor(() => expect(screen.queryByText("Soldier Helmet")).not.toBeInTheDocument());
    fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);

    // The strip's chips live inside the `inert` wrapper alongside the grid —
    // they must not be reachable while the picker traps focus.
    const chip = screen.getByRole("link", { name: /armas 0 de 2/i });
    let ancestor: HTMLElement | null = chip.parentElement;
    let foundInert = false;
    while (ancestor) {
      if (ancestor.hasAttribute("inert")) {
        foundInert = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    expect(foundInert).toBe(true);
  });

  /**
   * VISUAL REVIEW CRITICAL: at a real 390px viewport, `document.documentElement
   * .scrollWidth` measured 618px because the nav strip's `overflow-x-auto`
   * never actually contained its own content — every `flex flex-col`
   * ancestor between it and `<main>` (jsdom can't measure layout, so this
   * asserts the structural fix instead: `min-w-0` on every flex ancestor in
   * that chain, without which flexbox's default `min-width: auto` bubbles
   * the strip's ~554px min-content size all the way up to `<main>`).
   */
  it("every flex ancestor between <main> and the group-nav strip sets min-w-0 (prevents the strip's content width from forcing horizontal overflow at 390px)", () => {
    renderPage();
    const nav = screen.getByRole("navigation", { name: /grupos de slots/i });
    expect(nav.className).toContain("min-w-0");

    const main = document.getElementById("main-content") as HTMLElement;
    expect(main.className).toContain("min-w-0");

    let ancestor: HTMLElement | null = nav.parentElement;
    let sawMain = false;
    while (ancestor) {
      if (ancestor === main) {
        sawMain = true;
        break;
      }
      if (ancestor.className.includes("flex") && ancestor.className.includes("flex-col")) {
        expect(ancestor.className).toContain("min-w-0");
      }
      ancestor = ancestor.parentElement;
    }
    expect(sawMain).toBe(true);
  });
});
