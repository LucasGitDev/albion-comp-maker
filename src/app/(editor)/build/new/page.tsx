"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Slot } from "@/data/ao-data";
import type { AOItem } from "@/data/ao-data.d";
import { saveBuild } from "@/actions/builds";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { BuildHeader } from "@/components/editor/BuildHeader";
import { EditorActionBar } from "@/components/editor/EditorActionBar";
import { SLOT_LABELS } from "@/components/editor/SlotCard";
import { SLOT_COLUMNS, SLOT_ORDER } from "@/types/build";
import { SlotGrid } from "@/components/editor/SlotGrid";
import { SlotGroupNav } from "@/components/editor/SlotGroupNav";
import { SlotPickerPopover } from "@/components/editor/SlotPickerPopover";
import { SwapsSection } from "@/components/editor/SwapsSection";
import { groupSpellsForItem, type SpellCandidate } from "@/components/editor/spell-groups";
import { getEnchantOptions, getTierVariants, parseUniquename } from "@/components/editor/tier-enchant";
import type { EnchantOption, TierOption } from "@/components/editor/tier-enchant";
import { useItemCatalogue } from "@/components/editor/use-item-catalogue";
import type { SpellGroup } from "@/types/build";
import { selectActions, selectBuild, useBuildStore } from "@/store/build-store";

/** UI locale used for display and spell resolution (ACM-012, matches ItemPicker's own default). */
const LOCALE = "en-US";

type PickerTarget = { origin: "main"; slot: Slot } | { origin: "swap"; swapId: string; slot: Slot };

/**
 * Owns the only store subscription in the editor tree. Slot cards and the
 * header receive plain props; they never import the store directly.
 */
export default function NewBuildPage(): React.JSX.Element {
  const build = useBuildStore(selectBuild);
  const actions = useBuildStore(selectActions);
  const { items, loading, failed, failedReason, retry } = useItemCatalogue();
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
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
    setPickerTarget({ origin: "main", slot });
  }, []);

  const handleRequestSwapItemPick = useCallback((swapId: string, slot: Slot) => {
    setTriggerElement(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setPickerTarget({ origin: "swap", swapId, slot });
  }, []);

  const handleClosePicker = useCallback(() => {
    setPickerTarget(null);
  }, []);

  const handleSelect = useCallback(
    (item: AOItem) => {
      if (!pickerTarget) return;
      const { tier } = parseUniquename(item.uniquename);
      if (pickerTarget.origin === "main") {
        actions.setItem(pickerTarget.slot, item, tier, 0);
      } else {
        actions.setSwapItem(pickerTarget.swapId, pickerTarget.slot, item, tier, 0);
      }
      setPickerTarget(null);
    },
    [pickerTarget, actions]
  );

  const offhandLocked = Boolean(build.slots.mainhand?.twohanded);
  const activeSlotItem =
    pickerTarget?.origin === "main"
      ? build.slots[pickerTarget.slot]
      : pickerTarget?.origin === "swap"
        ? (build.swaps.find((swap) => swap.id === pickerTarget.swapId)?.slots[pickerTarget.slot] ?? null)
        : null;

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

  /**
   * Display name + spell-candidate lookups keyed by uniquename, built once
   * from the loaded catalogue (ACM-012 AC#2 — swap rows show item name and
   * spell icons the same way `SlotCard` does for main slots, just derived
   * here instead of per-slot since a swap's item isn't one of the 10 fixed
   * slots the rest of the page indexes by).
   */
  const itemNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of items) {
      map[item.uniquename] = item.localizedNames[LOCALE] ?? item.uniquename;
    }
    return map;
  }, [items]);

  const spellCandidatesByItemId = useMemo(() => {
    const map: Record<string, Partial<Record<SpellGroup, readonly SpellCandidate[]>>> = {};
    for (const item of items) {
      map[item.uniquename] = groupSpellsForItem(item, LOCALE);
    }
    return map;
  }, [items]);

  const offhandLockBlocksPicker =
    pickerTarget?.origin === "main" && pickerTarget.slot === "offhand" && offhandLocked;
  const pickerOpen = Boolean(pickerTarget) && !offhandLockBlocksPicker;

  const filledCount = SLOT_ORDER.filter((slot) => build.slots[slot] !== null).length;
  /**
   * Denominator for the mobile group-nav strip (ACM-041, doc-005 §7): a
   * locked offhand (two-handed mainhand) is excluded from both its group's
   * and the global total, not counted as pending. `EditorActionBar` still
   * passes `SLOT_ORDER.length` unmodified (ACM-065 tracks aligning it) — the
   * two numbers can legitimately disagree on screen until that lands.
   */
  const groupCounters = useMemo(
    () =>
      SLOT_COLUMNS.map((column) => {
        const reachableSlots = column.slots.filter(
          (slot) => !(slot === "offhand" && offhandLocked)
        );
        const filled = reachableSlots.filter((slot) => build.slots[slot] !== null).length;
        return { id: column.id, title: column.title, filled, total: reachableSlots.length };
      }),
    [build.slots, offhandLocked]
  );
  const totalReachableSlots = SLOT_ORDER.length - (offhandLocked ? 1 : 0);
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
        {/*
          Mobile-only (`md:hidden` inside the component). Lives inside the
          `inert` wrapper alongside the grid so the item picker's focus trap
          still covers it (doc-005 §8, ACM-046) — an anchor strip reachable
          behind an open modal would defeat the trap.
        */}
        <SlotGroupNav
          groups={groupCounters}
          totalFilled={filledCount}
          totalSlots={totalReachableSlots}
          swapsCount={build.swaps.length}
        />
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
        {/*
          `id`/`tabIndex`/`scroll-mt` here rather than inside `SwapsSection`
          itself (doc-005 §9 lists it "inalterado") — the Swaps chip in
          `SlotGroupNav` targets this wrapper, not a heading owned by the
          component.
        */}
        <div id="slot-group-swaps" tabIndex={-1} className="scroll-mt-[var(--group-nav-h)] outline-none">
          <SwapsSection
            swaps={build.swaps}
            buildSlots={build.slots}
            itemNames={itemNames}
            spellCandidatesByItemId={spellCandidatesByItemId}
            onAddSwap={actions.addSwap}
            onRemoveSwap={actions.removeSwap}
            onMoveSwap={actions.moveSwap}
            onSlotChange={actions.setSwapSlot}
            onRequestItemPick={handleRequestSwapItemPick}
            onLabelChange={actions.setSwapLabel}
            onSpellChange={actions.setSwapSpell}
          />
        </div>
      </div>
      {pickerTarget && !offhandLockBlocksPicker && (
        <SlotPickerPopover
          slot={pickerTarget.slot}
          items={items}
          catalogueLoading={loading}
          catalogueFailed={failed}
          catalogueFailedReason={failedReason}
          onRetryCatalogue={retry}
          value={activeSlotItem?.itemId ?? null}
          label={SLOT_LABELS[pickerTarget.slot] ?? pickerTarget.slot}
          restoreFocusTo={triggerElement}
          onSelect={handleSelect}
          onClose={handleClosePicker}
        />
      )}
    </main>
  );
}
