import { render, screen } from "@testing-library/react";
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

/**
 * ACM-041 root cause: SlotCard was hardcoded `w-[168px]`, which is why a
 * 326px-wide `<main>` could never fit two cards side by side. The fix is
 * fluid width capped at 168px only from `md` up, so the desktop pixel
 * dimension is unchanged (doc-005 §5.5) while mobile can go 2-up.
 */
describe("SlotCard width (ACM-041)", () => {
  it("empty slot: no fixed width, only a md+ max-width cap", () => {
    render(<SlotCard slot="head" item={null} onRequestItemPick={vi.fn()} />);
    const card = screen.getByText("Adicionar").closest("button") as HTMLElement;
    expect(card.className).not.toMatch(/(?<!max-)w-\[168px\]/);
    expect(card.className).toContain("w-full");
    expect(card.className).toContain("md:max-w-[168px]");
  });

  it("filled slot: same fluid/capped width contract", () => {
    render(<SlotCard slot="head" item={equipped()} onRequestItemPick={vi.fn()} />);
    const card = document.querySelector('[data-slot-state="filled"]') as HTMLElement;
    expect(card.className).toContain("w-full");
    expect(card.className).toContain("md:max-w-[168px]");
  });

  it("locked slot: same fluid/capped width contract", () => {
    render(<SlotCard slot="offhand" item={null} locked onRequestItemPick={vi.fn()} />);
    const card = document.querySelector('[data-slot-state="locked"]') as HTMLElement;
    expect(card.className).toContain("w-full");
    expect(card.className).toContain("md:max-w-[168px]");
  });
});
