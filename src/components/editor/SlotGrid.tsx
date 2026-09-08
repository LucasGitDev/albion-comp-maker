"use client";

import type { Slot } from "@/data/ao-data";
import type { BuildState, SpellGroup } from "@/types/build";
import { SLOT_COLUMNS } from "@/types/build";
import { CATEGORY_COLOR_VAR, SLOT_CATEGORY, SlotCard } from "./SlotCard";
import type { SpellCandidate } from "./spell-groups";
import type { EnchantOption, TierOption } from "./tier-enchant";

export type SlotGridProps = {
  build: BuildState;
  itemNames?: Partial<Record<Slot, string>>;
  /** Candidate spells per slot, keyed by group (ACM-010). See SlotCard. */
  spellCandidatesBySlot?: Partial<Record<Slot, Partial<Record<SpellGroup, readonly SpellCandidate[]>>>>;
  /**
   * True when mainhand holds a two-handed item, so the offhand card renders
   * locked. Callers derive this from the item catalog (mainhand's
   * `AOItem.twohanded`); this component has no catalog access.
   */
  offhandLocked?: boolean;
  /** Tier options per slot, derived from the catalogue by the caller (ACM-009). */
  tierOptionsBySlot?: Partial<Record<Slot, readonly TierOption[]>>;
  /** Enchant options per slot, derived by the caller from `AOItem.maxEnchant` (ACM-031). */
  enchantOptionsBySlot?: Partial<Record<Slot, readonly EnchantOption[]>>;
  onRequestItemPick: (slot: Slot) => void;
  onClearSlot: (slot: Slot) => void;
  onTierChange?: (slot: Slot, option: TierOption) => void;
  onEnchantChange?: (slot: Slot, enchant: EnchantOption) => void;
  onSpellChange?: (slot: Slot, group: SpellGroup, spellId: string | null) => void;
};

export function SlotGrid({
  build,
  itemNames,
  spellCandidatesBySlot,
  offhandLocked = false,
  tierOptionsBySlot,
  enchantOptionsBySlot,
  onRequestItemPick,
  onClearSlot,
  onTierChange,
  onEnchantChange,
  onSpellChange,
}: SlotGridProps): React.JSX.Element {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:flex-wrap md:gap-8">
      {SLOT_COLUMNS.map((column) => {
        const groupCategory = SLOT_CATEGORY[column.slots[0]];
        return (
        <div key={column.id} className="flex flex-col gap-3">
          {/*
           * `id` + `tabIndex={-1}` + `scroll-mt-[var(--group-nav-h)]` are the
           * anchor target for the mobile group-nav strip (ACM-041, doc-005
           * §5.4/§8). Harmless at md+: the strip never renders there, so the
           * scroll-margin is inert and the heading stays unreachable by Tab
           * (only a chip click/Enter calls `.focus()` on it directly).
           */}
          <h3
            id={`slot-group-${column.id}`}
            tabIndex={-1}
            className="scroll-mt-[var(--group-nav-h)] text-[11px] font-semibold uppercase tracking-[0.04em] outline-none"
            style={{ color: CATEGORY_COLOR_VAR[groupCategory] }}
            data-slot-category={groupCategory}
          >
            {column.title}
          </h3>
          <div className="grid grid-cols-2 gap-3 md:flex md:flex-col">
            {column.slots.map((slot) => (
              <SlotCard
                key={slot}
                slot={slot}
                item={build.slots[slot]}
                itemName={itemNames?.[slot]}
                spellCandidatesByGroup={spellCandidatesBySlot?.[slot]}
                locked={slot === "offhand" && offhandLocked}
                tierOptions={tierOptionsBySlot?.[slot]}
                enchantOptions={enchantOptionsBySlot?.[slot]}
                onRequestItemPick={onRequestItemPick}
                onClear={onClearSlot}
                onTierChange={onTierChange}
                onEnchantChange={onEnchantChange}
                onSpellChange={onSpellChange}
              />
            ))}
          </div>
        </div>
        );
      })}
    </div>
  );
}
