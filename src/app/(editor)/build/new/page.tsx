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
  const { items, loading, failed, failedReason, retry } = useItemCatalogue();
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);
  /**
   * Captured synchronously in the click handler, before the background is
   * marked `inert` on the next render — an inert ancestor force-blurs its
   * focused descendant immediately, so reading `document.activeElement`
   * from an effect inside the popover (after that render committed) always
   * sees `<body>` instead of the real trigger (ACM-034 follow-up review).
   * Kept in state (not a ref) so it can be read during render/passed as a
   * prop without violating the rules of hooks.
   */
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);

  const handleRequestItemPick = useCallback((slot: Slot) => {
    setTriggerElement(document.activeElement instanceof HTMLElement ? document.activeElement : null);
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

  const pickerOpen = Boolean(activeSlot) && !(activeSlot === "offhand" && offhandLocked);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      {/*
        Marked inert while the picker is open so background content can't be
        tabbed/clicked into or announced by AT — it reinforces (but doesn't
        replace) the popover's own focus trap (ACM-034 follow-up review).
      */}
      <div inert={pickerOpen} className="flex flex-col gap-6">
        <BuildHeader build={build} onNameChange={actions.setName} onRoleChange={actions.setRole} />
        <SlotGrid
          build={build}
          offhandLocked={offhandLocked}
          onRequestItemPick={handleRequestItemPick}
          onClearSlot={actions.clearSlot}
          onTierChange={(slot, option) => actions.setTier(slot, option.tier, option.itemId)}
          onSpellChange={actions.setSpell}
        />
      </div>
      {activeSlot && !(activeSlot === "offhand" && offhandLocked) && (
        <SlotPickerPopover
          slot={activeSlot}
          items={items}
          catalogueLoading={loading}
          catalogueFailed={failed}
          catalogueFailedReason={failedReason}
          onRetryCatalogue={retry}
          value={activeSlotItem?.itemId ?? null}
          label={SLOT_LABELS[activeSlot] ?? activeSlot}
          restoreFocusTo={triggerElement}
          onSelect={handleSelect}
          onClose={handleClosePicker}
        />
      )}
    </main>
  );
}
