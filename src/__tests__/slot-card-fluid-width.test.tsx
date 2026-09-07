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
 * fluid width fixed at 168px only from `md` up, so the desktop pixel
 * dimension is unchanged while mobile can go 2-up.
 *
 * VISUAL REVIEW CRITICAL (doc-005 §5.5's original `md:max-w-[168px]` claim
 * was measured FALSE in a real browser at 1440px: inside the flex-in-flex
 * ancestor chain `md:flex md:flex-row md:flex-wrap` > `md:flex md:flex-col`,
 * a percentage `w-full` does not resolve to a fixed 168px under
 * `max-width`, so cards rendered 122-134px instead of 168px, narrower than
 * `main` on unmodified `main`). `md:w-[168px]` (fixed width, not a cap) is
 * the only contract that survives that ancestor chain — assert the fixed
 * form here so a regression back to `max-w` fails this test.
 */
describe("SlotCard width (ACM-041)", () => {
  it("empty slot: fluid on mobile, fixed 168px from md up (not a max-width cap)", () => {
    render(<SlotCard slot="head" item={null} onRequestItemPick={vi.fn()} />);
    const card = screen.getByText("Adicionar").closest("button") as HTMLElement;
    expect(card.className).not.toMatch(/(?<!md:)w-\[168px\]/);
    expect(card.className).toContain("w-full");
    expect(card.className).toContain("md:w-[168px]");
    expect(card.className).not.toContain("md:max-w-[168px]");
  });

  it("filled slot: same fluid/fixed width contract", () => {
    render(<SlotCard slot="head" item={equipped()} onRequestItemPick={vi.fn()} />);
    const card = document.querySelector('[data-slot-state="filled"]') as HTMLElement;
    expect(card.className).toContain("w-full");
    expect(card.className).toContain("md:w-[168px]");
    expect(card.className).not.toContain("md:max-w-[168px]");
  });

  it("locked slot: same fluid/fixed width contract", () => {
    render(<SlotCard slot="offhand" item={null} locked onRequestItemPick={vi.fn()} />);
    const card = document.querySelector('[data-slot-state="locked"]') as HTMLElement;
    expect(card.className).toContain("w-full");
    expect(card.className).toContain("md:w-[168px]");
    expect(card.className).not.toContain("md:max-w-[168px]");
  });
});
