"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Slot } from "@/data/ao-data";
import type { AOItem } from "@/data/ao-data.d";
import { saveBuild } from "@/actions/builds";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { BuildHeader } from "@/components/editor/BuildHeader";
import { EditorActionBar } from "@/components/editor/EditorActionBar";
import { SLOT_LABELS } from "@/components/editor/SlotCard";
import { SLOT_ORDER } from "@/types/build";
import { SlotGrid } from "@/components/editor/SlotGrid";
import { SlotPickerPopover } from "@/components/editor/SlotPickerPopover";
import { getEnchantOptions, getTierVariants, parseUniquename } from "@/components/editor/tier-enchant";
import type { EnchantOption, TierOption } from "@/components/editor/tier-enchant";
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

  /**
   * Tier variants per filled slot, derived from the loaded catalogue
   * (ACM-009 AC#1). Previously never wired here, so the tier selector was
   * unreachable on the live route despite passing at the component level
   * (ACM-031 review finding) — fixed alongside the enchant wiring below
   * since it is the same gap.
   */
  const tierOptionsBySlot = useMemo(() => {
    const map: Partial<Record<Slot, readonly TierOption[]>> = {};
    for (const slot of SLOT_ORDER) {
      const equipped = build.slots[slot];
      if (!equipped) continue;
      const options = getTierVariants(items, equipped.itemId);
      if (options.length > 0) map[slot] = options;
    }
    return map;
  }, [build.slots, items]);

  /**
   * Enchant options per filled slot, derived from `EquippedItem.maxEnchant`
   * (persisted on the slot at equip time — no catalogue lookup needed,
   * ACM-031). Wiring this into `SlotGrid` is what makes the enchant
   * selector actually reachable on `/build/new` (ACM-031 review finding).
   */
  const enchantOptionsBySlot = useMemo(() => {
    const map: Partial<Record<Slot, readonly EnchantOption[]>> = {};
    for (const slot of SLOT_ORDER) {
      const equipped = build.slots[slot];
      if (!equipped) continue;
      map[slot] = getEnchantOptions({ maxEnchant: equipped.maxEnchant });
    }
    return map;
  }, [build.slots]);

  const pickerOpen = Boolean(activeSlot) && !(activeSlot === "offhand" && offhandLocked);

  const filledCount = SLOT_ORDER.filter((slot) => build.slots[slot] !== null).length;
  /**
   * `#capture-root`/the `BuildCard` preview isn't wired into this route yet
   * (that's ACM-018/019 territory, not ACM-037). Deliberately left
   * unattached to any DOM node — `EditorActionBar` only ever *reads*
   * through this ref (decision-010), and with nothing mounted, "Exportar
   * PNG" correctly reports "Card não está pronto para exportar." instead of
   * faking success against the interactive form tree.
   */
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  const handleSave = useCallback(async () => {
    // ACM-018 landed `saveBuild` (Server Action, requireSession() + ownership
    // scoping — src/actions/builds.ts). This route always creates: there is
    // no persisted id in `BuildState` yet, so every "Salvar" here is a new
    // row. Editing an existing build is a future route's concern.
    await saveBuild({
      name: build.name,
      role: build.role.trim() === "" ? null : build.role,
      content: JSON.stringify(build),
    });
  }, [build]);

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex max-w-6xl flex-col gap-6 p-8 pb-24 md:pb-8 outline-none">
      <Breadcrumb current={build.name.trim() || "Nova build"} />
      <EditorActionBar
        buildName={build.name}
        filledCount={filledCount}
        totalSlots={SLOT_ORDER.length}
        captureNodeRef={previewContainerRef}
        onSave={handleSave}
      />
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
          tierOptionsBySlot={tierOptionsBySlot}
          enchantOptionsBySlot={enchantOptionsBySlot}
          onRequestItemPick={handleRequestItemPick}
          onClearSlot={actions.clearSlot}
          onTierChange={(slot, option) => actions.setTier(slot, option.tier, option.itemId)}
          onEnchantChange={(slot, enchant) => actions.setEnchant(slot, enchant)}
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
