"use client";

import { useCallback, useState } from "react";
import type { Slot } from "@/data/ao-data";
import type { AOItem } from "@/data/ao-data.d";
import { BuildHeader } from "@/components/editor/BuildHeader";
import { SLOT_LABELS } from "@/components/editor/SlotCard";
import { SlotGrid } from "@/components/editor/SlotGrid";
import { SlotPickerPopover } from "@/components/editor/SlotPickerPopover";
import { parseUniquename } from "@/components/editor/tier-enchant";
import { useItemCatalogue } from "@/components/editor/use-item-catalogue";
import { selectActions, selectBuild, useBuildStore } from "@/store/build-store";

/**
 * Owns the only store subscription in the editor tree. Slot cards and the
 * header receive plain props; they never import the store directly.
 */
export default function NewBuildPage(): React.JSX.Element {
  const build = useBuildStore(selectBuild);
  const actions = useBuildStore(selectActions);
  const { items } = useItemCatalogue();
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);

  const handleRequestItemPick = useCallback((slot: Slot) => {
    setActiveSlot(slot);
  }, []);

  const handleClosePicker = useCallback(() => {
    setActiveSlot(null);
  }, []);

  const handleSelect = useCallback(
    (item: AOItem) => {
      if (!activeSlot) return;
      const { tier } = parseUniquename(item.uniquename);
      actions.setItem(activeSlot, item, tier, 0);
      setActiveSlot(null);
    },
    [activeSlot, actions]
  );

  const offhandLocked = Boolean(build.slots.mainhand?.twohanded);
  const activeSlotItem = activeSlot ? build.slots[activeSlot] : null;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <BuildHeader build={build} onNameChange={actions.setName} onRoleChange={actions.setRole} />
      <SlotGrid
        build={build}
        offhandLocked={offhandLocked}
        onRequestItemPick={handleRequestItemPick}
        onClearSlot={actions.clearSlot}
        onTierChange={(slot, option) => actions.setTier(slot, option.tier, option.itemId)}
        onSpellChange={actions.setSpell}
      />
      {activeSlot && !(activeSlot === "offhand" && offhandLocked) && (
        <SlotPickerPopover
          slot={activeSlot}
          items={items}
          value={activeSlotItem?.itemId ?? null}
          label={SLOT_LABELS[activeSlot] ?? activeSlot}
          onSelect={handleSelect}
          onClose={handleClosePicker}
        />
      )}
    </main>
  );
}
