"use client";

import type { Slot } from "@/data/ao-data";
import type { BuildState, SpellGroup } from "@/types/build";
import { SLOT_COLUMNS } from "@/types/build";
import { SlotCard } from "./SlotCard";
import type { SpellCandidate } from "./spell-groups";
import type { TierOption } from "./tier-enchant";

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
  onRequestItemPick: (slot: Slot) => void;
  onClearSlot: (slot: Slot) => void;
  onTierChange?: (slot: Slot, option: TierOption) => void;
  onSpellChange?: (slot: Slot, group: SpellGroup, spellId: string | null) => void;
};

export function SlotGrid({
  build,
  itemNames,
  spellCandidatesBySlot,
  offhandLocked = false,
  tierOptionsBySlot,
  onRequestItemPick,
  onClearSlot,
  onTierChange,
  onSpellChange,
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
                spellCandidatesByGroup={spellCandidatesBySlot?.[slot]}
                locked={slot === "offhand" && offhandLocked}
                tierOptions={tierOptionsBySlot?.[slot]}
                onRequestItemPick={onRequestItemPick}
                onClear={onClearSlot}
                onTierChange={onTierChange}
                onSpellChange={onSpellChange}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
