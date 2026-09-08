import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlotCard } from "@/components/editor/SlotCard";
import type { EquippedItem } from "@/types/build";

function equipped(overrides: Partial<EquippedItem> = {}): EquippedItem {
  return {
    itemId: "T6_HEAD_PLATE_SET1",
    tier: 6,
    enchant: 0,
    spells: { q: null, w: null, e: null, passive: null },
    twohanded: false,
    maxEnchant: 4,
    ...overrides,
  };
}

const LONG_NAME =
  "Ravenlord's Ceremonial Grandmaster Helmet of the Endless Twilight Sanctuary";

describe("SlotCard density (ACM-075)", () => {
  it("AC#1: icon and name render inside the same horizontal row, not stacked", () => {
    render(<SlotCard slot="head" item={equipped()} itemName="Guardian Helmet" onRequestItemPick={vi.fn()} />);
    const nameEl = document.querySelector('[title="Guardian Helmet"]') as HTMLElement;
    const row = nameEl.closest("button") as HTMLElement;
    // The icon wrapper and the name column must be direct siblings inside
    // the same clickable row so they sit on one horizontal line.
    const iconWrapper = row.querySelector('[data-icon-status]')?.closest("div");
    expect(iconWrapper).not.toBeNull();
    expect(iconWrapper?.parentElement).toBe(row);
    // Regression guard: a `flex-col` row would put icon above name again,
    // reintroducing the stacked layout AC#1 forbids.
    expect(row.className).not.toMatch(/(?<!-)flex-col/);
    expect(row.className).toContain("items-center");
  });

  it("AC#6/#8: a long item name is truncated to one line but the full text stays in the DOM and in `title`", () => {
    render(<SlotCard slot="head" item={equipped()} itemName={LONG_NAME} onRequestItemPick={vi.fn()} />);
    const nameEl = document.querySelector(`[title="${LONG_NAME}"]`) as HTMLElement;
    expect(nameEl).not.toBeNull();
    // Behavioral guard, not just a class check: the rendered text is the
    // full, unsliced name — CSS (not string truncation) does the clipping —
    // and `title` exposes that same full name on hover.
    expect(nameEl.textContent).toBe(LONG_NAME);
    expect(nameEl.getAttribute("title")).toBe(LONG_NAME);
    // Single-line ellipsis, never a multi-line clamp (which would grow the
    // card's height back up — the exact regression ACM-075 fixes).
    expect(nameEl.className).toContain("truncate");
    expect(nameEl.className).not.toMatch(/line-clamp/);
  });

  it("AC#3: the clickable icon+name row stays at least 44x44 CSS px regardless of name length", () => {
    render(<SlotCard slot="head" item={equipped()} itemName="X" onRequestItemPick={vi.fn()} />);
    const row = (document.querySelector('[title="X"]') as HTMLElement).closest("button") as HTMLElement;
    // Icon box (size-10 = 40px) + p-1 padding (4px each side) on the row:
    // 40 + 4 + 4 = 48, comfortably above the 44px floor on both axes even
    // when the name column collapses to almost nothing.
    expect(row.className).toMatch(/\bp-1\b/);
    const iconBox = row.querySelector('[data-icon-status]')?.closest("div") as HTMLElement;
    expect(iconBox.className).toContain("size-10");
  });
});
