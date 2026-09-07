import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlotCard } from "@/components/editor/SlotCard";
import type { EquippedItem } from "@/types/build";

function equipped(overrides: Partial<EquippedItem>): EquippedItem {
  return {
    itemId: "T6_HEAD_PLATE_SET1",
    tier: 6,
    enchant: 0,
    spells: { q: null, w: null, e: null, passive: null },
    twohanded: false,
    ...overrides,
  };
}

const TIER_OPTIONS = [4, 5, 6, 7, 8].map((tier) => ({ tier, itemId: `T${tier}_HEAD_PLATE_SET1` }));
const ENCHANT_OPTIONS = [0, 1, 2].map((enchant) => ({ enchant: enchant as 0 | 1 | 2, itemId: `T6_HEAD_PLATE_SET1${enchant ? `@${enchant}` : ""}` }));

describe("SlotCard tier/enchant selectors (ACM-009)", () => {
  it("does not render selectors when no options are supplied (e.g. empty catalogue)", () => {
    render(<SlotCard slot="head" item={equipped({})} onRequestItemPick={vi.fn()} />);
    expect(screen.queryByTestId("tier-enchant-selectors")).toBeNull();
  });

  it("does not render selectors on an empty slot", () => {
    render(
      <SlotCard
        slot="head"
        item={null}
        tierOptions={TIER_OPTIONS}
        enchantOptions={ENCHANT_OPTIONS}
        onRequestItemPick={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("tier-enchant-selectors")).toBeNull();
  });

  it("AC #1: shows one option per tier variant sharing the same base id", () => {
    render(
      <SlotCard
        slot="head"
        item={equipped({})}
        tierOptions={TIER_OPTIONS}
        onRequestItemPick={vi.fn()}
        onTierChange={vi.fn()}
      />,
    );
    const select = screen.getByLabelText("Tier de Cabeça") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(["4", "5", "6", "7", "8"]);
  });

  it("AC #2: enchant select only offers 0..maxEnchant options from the catalogue", () => {
    render(
      <SlotCard
        slot="head"
        item={equipped({})}
        enchantOptions={ENCHANT_OPTIONS}
        onRequestItemPick={vi.fn()}
        onEnchantChange={vi.fn()}
      />,
    );
    const select = screen.getByLabelText("Encanto de Cabeça") as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(["0", "1", "2"]);
  });

  it("AC #3: changing tier notifies the caller with the resolved sibling item, updating the icon on re-render", () => {
    const onTierChange = vi.fn();
    const { rerender } = render(
      <SlotCard
        slot="head"
        item={equipped({})}
        tierOptions={TIER_OPTIONS}
        onRequestItemPick={vi.fn()}
        onTierChange={onTierChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tier de Cabeça"), { target: { value: "8" } });
    expect(onTierChange).toHaveBeenCalledWith("head", { tier: 8, itemId: "T8_HEAD_PLATE_SET1" });

    rerender(
      <SlotCard
        slot="head"
        item={equipped({ tier: 8, itemId: "T8_HEAD_PLATE_SET1" })}
        tierOptions={TIER_OPTIONS}
        onRequestItemPick={vi.fn()}
        onTierChange={onTierChange}
      />,
    );
    expect(screen.getByAltText("T8_HEAD_PLATE_SET1")).toBeInTheDocument();
    expect(screen.getByLabelText("Tier de Cabeça")).toHaveValue("8");
  });

  it("AC #3: changing enchant notifies the caller with the resolved sibling item", () => {
    const onEnchantChange = vi.fn();
    render(
      <SlotCard
        slot="head"
        item={equipped({})}
        enchantOptions={ENCHANT_OPTIONS}
        onRequestItemPick={vi.fn()}
        onEnchantChange={onEnchantChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Encanto de Cabeça"), { target: { value: "2" } });
    expect(onEnchantChange).toHaveBeenCalledWith("head", { enchant: 2, itemId: "T6_HEAD_PLATE_SET1@2" });
  });
});
