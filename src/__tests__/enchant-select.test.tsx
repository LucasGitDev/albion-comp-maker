import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlotCard } from "@/components/editor/SlotCard";
import { getEnchantOptions } from "@/components/editor/tier-enchant";
import type { EquippedItem } from "@/types/build";

function equipped(overrides: Partial<EquippedItem>): EquippedItem {
  return {
    itemId: "T4_HEAD_PLATE_SET1",
    tier: 4,
    enchant: 0,
    spells: { q: null, w: null, e: null, passive: null },
    twohanded: false,
    ...overrides,
  };
}

// Real fixture items (see src/__tests__/fixtures/ao-corpus.json): T4_HEAD_PLATE_SET1
// has maxEnchant 4, T1_OFF_SHIELD has maxEnchant 0 (decision-011 / ACM-031 AC#5).
const ENCHANTABLE_OPTIONS = getEnchantOptions({ maxEnchant: 4 });
const NON_ENCHANTABLE_OPTIONS = getEnchantOptions({ maxEnchant: 0 });

describe("SlotCard enchant selector (ACM-031 AC#2)", () => {
  it("does not render an enchant selector when the item has maxEnchant 0", () => {
    render(
      <SlotCard
        slot="offhand"
        item={equipped({ itemId: "T1_OFF_SHIELD" })}
        enchantOptions={NON_ENCHANTABLE_OPTIONS}
        onRequestItemPick={vi.fn()}
        onEnchantChange={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText(/Encantamento/)).toBeNull();
  });

  it("does not render when enchantOptions is omitted", () => {
    render(<SlotCard slot="head" item={equipped({})} onRequestItemPick={vi.fn()} />);
    expect(screen.queryByLabelText(/Encantamento/)).toBeNull();
  });

  it("renders a select with 0..maxEnchant when the item is enchantable", () => {
    render(
      <SlotCard
        slot="head"
        item={equipped({})}
        enchantOptions={ENCHANTABLE_OPTIONS}
        onRequestItemPick={vi.fn()}
        onEnchantChange={vi.fn()}
      />,
    );
    const select = screen.getByLabelText("Encantamento de Cabeça") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(["0", "1", "2", "3", "4"]);
  });

  it("notifies the caller with the new enchant level on change", () => {
    const onEnchantChange = vi.fn();
    render(
      <SlotCard
        slot="head"
        item={equipped({})}
        enchantOptions={ENCHANTABLE_OPTIONS}
        onRequestItemPick={vi.fn()}
        onEnchantChange={onEnchantChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Encantamento de Cabeça"), { target: { value: "3" } });
    expect(onEnchantChange).toHaveBeenCalledWith("head", 3);
  });

  it("renders the enchant badge for the equipped item's current level", () => {
    const { container } = render(
      <SlotCard
        slot="head"
        item={equipped({ enchant: 2 })}
        enchantOptions={ENCHANTABLE_OPTIONS}
        onRequestItemPick={vi.fn()}
        onEnchantChange={vi.fn()}
      />,
    );
    const badge = container.querySelector('[data-testid="enchant-badge"]');
    expect(badge?.textContent).toBe(".2");
  });

  it("renders no badge when enchant is 0", () => {
    const { container } = render(
      <SlotCard
        slot="head"
        item={equipped({ enchant: 0 })}
        enchantOptions={ENCHANTABLE_OPTIONS}
        onRequestItemPick={vi.fn()}
        onEnchantChange={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-testid="enchant-badge"]')).toBeNull();
  });
});
