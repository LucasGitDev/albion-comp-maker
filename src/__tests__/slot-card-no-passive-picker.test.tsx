import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlotCard } from "@/components/editor/SlotCard";
import type { SpellCandidate } from "@/components/editor/spell-groups";
import type { EquippedItem, SpellGroup } from "@/types/build";
import type { Slot } from "@/data/ao-data";

function equipped(overrides: Partial<EquippedItem>): EquippedItem {
  return {
    itemId: "T4_CAPEITEM_FW_BRIDGEWATCH",
    tier: 4,
    enchant: 0,
    spells: { q: null, w: null, e: null, passive: null },
    twohanded: false,
    maxEnchant: 0,
    ...overrides,
  };
}

const PASSIVE_CANDIDATES: readonly SpellCandidate[] = [
  { uniquename: "PASSIVE_CAPE_BRIDGEWATCH", name: "Sandstorm" },
];

describe("SlotCard passive exclusion for non-selectable categories (ACM-090)", () => {
  const nonSelectableSlots: Slot[] = ["cape", "bag", "mount", "food", "potion"];

  it.each(nonSelectableSlots)(
    "never renders a passive row for slot=%s even when the item resolves a passive spell",
    (slot) => {
      render(
        <SlotCard
          slot={slot}
          item={equipped({})}
          spellCandidatesByGroup={{ passive: PASSIVE_CANDIDATES }}
          onRequestItemPick={vi.fn()}
          onSpellChange={vi.fn()}
        />
      );

      expect(screen.queryByTestId("spell-group-passive")).toBeNull();
      // The item genuinely has no *selectable* ability once passive is
      // excluded, so the picker falls back to the "no abilities" message
      // instead of rendering an empty chip row.
      expect(screen.getByTestId("spell-picker-empty")).toBeInTheDocument();
    }
  );

  it("still renders the passive row for a slot where the passive is a real selectable ability (armor)", () => {
    render(
      <SlotCard
        slot="armor"
        item={equipped({ itemId: "T4_ARMOR_PLATE_SET3" })}
        spellCandidatesByGroup={{ passive: PASSIVE_CANDIDATES }}
        onRequestItemPick={vi.fn()}
        onSpellChange={vi.fn()}
      />
    );

    expect(screen.getByTestId("spell-group-passive")).toBeInTheDocument();
  });

  it("does not auto-select the excluded passive candidate via onSpellChange for cape", () => {
    const onSpellChange = vi.fn();
    render(
      <SlotCard
        slot="cape"
        item={equipped({})}
        spellCandidatesByGroup={{ passive: PASSIVE_CANDIDATES }}
        onRequestItemPick={vi.fn()}
        onSpellChange={onSpellChange}
      />
    );

    const passiveCalls = onSpellChange.mock.calls.filter(
      (call: unknown[]) => (call[1] as SpellGroup) === "passive"
    );
    expect(passiveCalls).toHaveLength(0);
  });
});
