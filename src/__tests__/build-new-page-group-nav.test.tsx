import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AOItem } from "@/data/ao-data.d";

vi.mock("@/components/editor/use-item-catalogue", () => {
  const items: AOItem[] = [
    {
      uniquename: "T4_HEAD_PLATE_SET1",
      slot: "head",
      localizedNames: { "en-US": "Soldier Helmet" },
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
import { useBuildStore } from "@/store/build-store";

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
    render(<NewBuildPage />);
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
    render(<NewBuildPage />);
    expect(screen.getByRole("link", { name: /armas 1 de 1/i })).toBeInTheDocument();
  });

  it("clicking a group chip moves focus to that group's heading, not <body>", () => {
    render(<NewBuildPage />);
    const chip = screen.getByRole("link", { name: /consumíveis 0 de 2/i });
    fireEvent.click(chip);
    const heading = document.getElementById("slot-group-consumiveis");
    expect(document.activeElement).toBe(heading);
    expect(document.activeElement).not.toBe(document.body);
  });

  it("the item picker's focus trap still works with the group-nav strip mounted", async () => {
    render(<NewBuildPage />);
    const headSlot = document.querySelector('[data-slot="head"][data-slot-state="empty"]')!;
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
});
