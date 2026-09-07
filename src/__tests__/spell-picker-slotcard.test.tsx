import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlotCard } from "@/components/editor/SlotCard";
import type { SpellCandidate } from "@/components/editor/spell-groups";
import type { EquippedItem } from "@/types/build";

/** Real item (T4_ARMOR_PLATE_SET3) and its Q candidates from the ao-corpus fixture. */
function equipped(overrides: Partial<EquippedItem>): EquippedItem {
  return {
    itemId: "T4_ARMOR_PLATE_SET3",
    tier: 4,
    enchant: 0,
    spells: { q: null, w: null, e: null, passive: null },
    twohanded: false,
    ...overrides,
  };
}

const Q_CANDIDATES: SpellCandidate[] = [
  { uniquename: "OUTOFCOMBATHEAL", name: "Out of Combat Heal" },
  { uniquename: "TAUNT", name: "Taunt" },
];

describe("SlotCard spell picker wiring (ACM-010)", () => {
  it("does not render a spell picker when onSpellChange is not supplied", () => {
    render(
      <SlotCard
        slot="armor"
        item={equipped({})}
        spellCandidatesByGroup={{ q: Q_CANDIDATES }}
        onRequestItemPick={vi.fn()}
      />
    );
    expect(screen.queryByTestId("spell-picker")).toBeNull();
  });

  it("does not render a spell picker for an item exposing no spells (e.g. an offhand, decision-005)", () => {
    render(
      <SlotCard
        slot="offhand"
        item={equipped({ itemId: "T4_OFF_TOWERSHIELD" })}
        spellCandidatesByGroup={{}}
        onRequestItemPick={vi.fn()}
        onSpellChange={vi.fn()}
      />
    );
    expect(screen.queryByTestId("spell-picker")).toBeNull();
  });

  it("selecting a chip forwards slot, group and spell id to onSpellChange", () => {
    const onSpellChange = vi.fn();
    render(
      <SlotCard
        slot="armor"
        item={equipped({})}
        itemName="Guardian Armor"
        spellCandidatesByGroup={{ q: Q_CANDIDATES }}
        onRequestItemPick={vi.fn()}
        onSpellChange={onSpellChange}
      />
    );

    fireEvent.click(screen.getByTitle("Taunt"));
    expect(onSpellChange).toHaveBeenCalledWith("armor", "q", "TAUNT");
  });
});
