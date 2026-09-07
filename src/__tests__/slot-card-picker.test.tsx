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

describe("SlotCard empty-slot icon (ACM-035)", () => {
  it("never renders ItemIcon (or its error state) for an empty slot", () => {
    render(<SlotCard slot="head" item={null} onRequestItemPick={vi.fn()} />);
    expect(screen.queryByText("!")).not.toBeInTheDocument();
    expect(document.querySelector('[data-icon-status="error"]')).toBeNull();
  });

  it("renders a category silhouette instead", () => {
    render(<SlotCard slot="mainhand" item={null} onRequestItemPick={vi.fn()} />);
    expect(document.querySelector('[data-slot-placeholder="weapon"]')).toBeInTheDocument();
  });

  it("still renders the real ItemIcon (via /api/icon) for a filled slot", () => {
    render(<SlotCard slot="head" item={equipped({})} onRequestItemPick={vi.fn()} />);
    expect(document.querySelector('[data-icon-status]')).not.toBeNull();
    expect(document.querySelector('[data-icon-status="error"]')).toBeNull();
  });
});

describe("SlotCard request-pick wiring (ACM-034)", () => {
  it("calls onRequestItemPick when an empty slot is clicked", () => {
    const onRequestItemPick = vi.fn();
    render(<SlotCard slot="head" item={null} onRequestItemPick={onRequestItemPick} />);
    fireEvent.click(screen.getByText("Adicionar"));
    expect(onRequestItemPick).toHaveBeenCalledWith("head");
  });

  it("reopens the picker when a filled slot's icon/name area is clicked", () => {
    const onRequestItemPick = vi.fn();
    render(
      <SlotCard slot="head" item={equipped({})} onRequestItemPick={onRequestItemPick} onClear={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /alterar/i }));
    expect(onRequestItemPick).toHaveBeenCalledWith("head");
  });

  it("does not trigger onRequestItemPick when the clear (x) button is clicked", () => {
    const onRequestItemPick = vi.fn();
    const onClear = vi.fn();
    render(
      <SlotCard slot="head" item={equipped({})} onRequestItemPick={onRequestItemPick} onClear={onClear} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /limpar/i }));
    expect(onClear).toHaveBeenCalledWith("head");
    expect(onRequestItemPick).not.toHaveBeenCalled();
  });

  it("never opens the picker for a locked offhand", () => {
    const onRequestItemPick = vi.fn();
    render(<SlotCard slot="offhand" item={null} locked onRequestItemPick={onRequestItemPick} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
