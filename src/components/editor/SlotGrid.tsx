"use client";

import type { Slot } from "@/data/ao-data";
import type { BuildState, SpellGroup } from "@/types/build";
import { SLOT_COLUMNS } from "@/types/build";
import { SlotCard } from "./SlotCard";
import type { EnchantOption, TierOption } from "./tier-enchant";

export type SlotGridProps = {
  build: BuildState;
  itemNames?: Partial<Record<Slot, string>>;
  spellGroupsBySlot?: Partial<Record<Slot, readonly SpellGroup[]>>;
  /**
   * True when mainhand holds a two-handed item, so the offhand card renders
   * locked. Callers derive this from the item catalog (mainhand's
   * `AOItem.twohanded`); this component has no catalog access.
   */
  offhandLocked?: boolean;
  /** Tier options per slot, derived from the catalogue by the caller (ACM-009). */
  tierOptionsBySlot?: Partial<Record<Slot, readonly TierOption[]>>;
  /** Enchant options per slot, derived from the catalogue by the caller (ACM-009). */
  enchantOptionsBySlot?: Partial<Record<Slot, readonly EnchantOption[]>>;
  onRequestItemPick: (slot: Slot) => void;
  onClearSlot: (slot: Slot) => void;
  onTierChange?: (slot: Slot, option: TierOption) => void;
  onEnchantChange?: (slot: Slot, option: EnchantOption) => void;
};

export function SlotGrid({
  build,
  itemNames,
  spellGroupsBySlot,
  offhandLocked = false,
  tierOptionsBySlot,
  enchantOptionsBySlot,
  onRequestItemPick,
  onClearSlot,
  onTierChange,
  onEnchantChange,
}: SlotGridProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-8">
      {SLOT_COLUMNS.map((column) => (
        <div key={column.title} className="flex flex-col gap-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
            {column.title}
          </h3>
          <div className="flex flex-col gap-3">
            {column.slots.map((slot) => (
              <SlotCard
                key={slot}
                slot={slot}
                item={build.slots[slot]}
                itemName={itemNames?.[slot]}
                spellGroups={spellGroupsBySlot?.[slot]}
                locked={slot === "offhand" && offhandLocked}
                tierOptions={tierOptionsBySlot?.[slot]}
                enchantOptions={enchantOptionsBySlot?.[slot]}
                onRequestItemPick={onRequestItemPick}
                onClear={onClearSlot}
                onTierChange={onTierChange}
                onEnchantChange={onEnchantChange}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
