import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlotCard } from "@/components/editor/SlotCard";
import { groupSpellsForItem } from "@/components/editor/spell-groups";
import type { AOItem, Slot } from "@/data/ao-data";
import type { EquippedItem, SpellGroup } from "@/types/build";

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

function catalogueItem(overrides: Partial<AOItem>): AOItem {
  return {
    uniquename: "T4_CAPEITEM_FW_BRIDGEWATCH",
    slot: "cape",
    localizedNames: { "EN-US": "Bridgewatch Cape" },
    twohanded: false,
    maxEnchant: 0,
    spells: [
      {
        uniquename: "PASSIVE_CAPE_BRIDGEWATCH",
        slotGroup: "1",
        kind: "passive",
        localizedNames: { "EN-US": "Sandstorm" },
      },
    ],
    ...overrides,
  };
}

/**
 * `spellCandidatesByGroup` is always derived upstream via
 * `groupSpellsForItem` (both by the editor page and by the exported card's
 * `buildCardLookupsFor`) — that's the single source of truth for the
 * ACM-090 exclusion (see `NON_SELECTABLE_PASSIVE_SLOTS` in
 * `spell-groups.ts`). `SlotCard` itself no longer reapplies any filtering,
 * so these tests exercise the real upstream helper rather than
 * hand-crafting an already-filtered/unfiltered prop.
 */
describe("SlotCard passive exclusion for non-selectable categories (ACM-090)", () => {
  const nonSelectableSlots: Slot[] = ["cape", "bag", "mount", "food", "potion"];

  it.each(nonSelectableSlots)(
    "never renders a passive row for slot=%s even when the item resolves a passive spell",
    (slot) => {
      const item = catalogueItem({ slot });
      render(
        <SlotCard
          slot={slot}
          item={equipped({})}
          spellCandidatesByGroup={groupSpellsForItem(item, "EN-US")}
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
    const item = catalogueItem({ uniquename: "T4_ARMOR_PLATE_SET3", slot: "armor" });
    render(
      <SlotCard
        slot="armor"
        item={equipped({ itemId: "T4_ARMOR_PLATE_SET3" })}
        spellCandidatesByGroup={groupSpellsForItem(item, "EN-US")}
        onRequestItemPick={vi.fn()}
        onSpellChange={vi.fn()}
      />
    );

    expect(screen.getByTestId("spell-group-passive")).toBeInTheDocument();
  });

  it("does not auto-select the excluded passive candidate via onSpellChange for cape", () => {
    const onSpellChange = vi.fn();
    const item = catalogueItem({});
    render(
      <SlotCard
        slot="cape"
        item={equipped({})}
        spellCandidatesByGroup={groupSpellsForItem(item, "EN-US")}
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
