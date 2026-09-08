import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlotCard } from "@/components/editor/SlotCard";
import { SlotGrid } from "@/components/editor/SlotGrid";
import { createEmptyBuild } from "@/types/build";

/**
 * ACM-039: each slot category (weapon/armor/utility/consumable) must expose
 * a distinct color via `data-slot-category`, both empty and filled, so the
 * category is legible before any item is equipped (AC #3, #4, #8).
 */
describe("Slot category color affordance (ACM-039)", () => {
  it("renders 4 distinct data-slot-category values for empty slots across categories", () => {
    render(
      <>
        <SlotCard slot="mainhand" item={null} onRequestItemPick={vi.fn()} />
        <SlotCard slot="head" item={null} onRequestItemPick={vi.fn()} />
        <SlotCard slot="bag" item={null} onRequestItemPick={vi.fn()} />
        <SlotCard slot="food" item={null} onRequestItemPick={vi.fn()} />
      </>
    );

    const nodes = [
      document.querySelector('[data-slot="mainhand"]'),
      document.querySelector('[data-slot="head"]'),
      document.querySelector('[data-slot="bag"]'),
      document.querySelector('[data-slot="food"]'),
    ];

    const values = nodes.map((n) => n?.getAttribute("data-slot-category"));
    expect(values).toEqual(["weapon", "armor", "utility", "consumable"]);
    expect(new Set(values).size).toBe(4);
  });

  it("keeps the same data-slot-category once the slot is filled", () => {
    render(
      <SlotCard
        slot="mainhand"
        item={{
          itemId: "T4_MAIN_SWORD",
          tier: 4,
          enchant: 0,
          spells: { q: null, w: null, e: null, passive: null },
          twohanded: false,
          maxEnchant: 4,
        }}
        onRequestItemPick={vi.fn()}
      />
    );

    const node = document.querySelector('[data-slot="mainhand"]');
    expect(node?.getAttribute("data-slot-category")).toBe("weapon");
    expect(node?.getAttribute("data-slot-state")).toBe("filled");
  });

  it("colors each SlotGrid group title with its own category token, 4 distinct values", () => {
    render(
      <SlotGrid
        build={createEmptyBuild()}
        onRequestItemPick={vi.fn()}
        onClearSlot={vi.fn()}
      />
    );

    const armas = document.getElementById("slot-group-armas");
    const armadura = document.getElementById("slot-group-armadura");
    const utilidade = document.getElementById("slot-group-utilidade");
    const consumiveis = document.getElementById("slot-group-consumiveis");

    const categories = [armas, armadura, utilidade, consumiveis].map((el) =>
      el?.getAttribute("data-slot-category")
    );
    expect(categories).toEqual(["weapon", "armor", "utility", "consumable"]);
    expect(new Set(categories).size).toBe(4);

    // Category is never the sole channel: the textual title stays intact.
    expect(screen.getByText("Armas")).toBeInTheDocument();
    expect(screen.getByText("Armadura")).toBeInTheDocument();
    expect(screen.getByText("Utilidade")).toBeInTheDocument();
    expect(screen.getByText("Consumíveis")).toBeInTheDocument();
  });
});
