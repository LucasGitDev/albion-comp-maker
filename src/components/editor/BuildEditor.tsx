"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Slot } from "@/data/ao-data";
import type { AOItem } from "@/data/ao-data.d";
import { saveBuild, updateBuild } from "@/actions/builds";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { BuildCard } from "@/components/build-card";
import { DEFAULT_BUILD_CARD_THEME, type BuildCardTheme } from "@/components/build-card/types";
import { BuildHeader } from "@/components/editor/BuildHeader";
import { EditorActionBar } from "@/components/editor/EditorActionBar";
import { getSlotLabels } from "@/components/editor/SlotCard";
import { SLOT_COLUMNS, SLOT_ORDER, type BuildState } from "@/types/build";
import { SlotGrid } from "@/components/editor/SlotGrid";
import { SlotGroupNav } from "@/components/editor/SlotGroupNav";
import { SlotPickerPopover } from "@/components/editor/SlotPickerPopover";
import { SwapsSection } from "@/components/editor/SwapsSection";
import { ThemePanel } from "@/components/editor/ThemePanel";
import { groupSpellsForItem, type SpellCandidate } from "@/components/editor/spell-groups";
import { resolveLocalizedName } from "@/lib/localized-name";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { getEnchantOptions, getTierVariants, parseUniquename } from "@/components/editor/tier-enchant";
import type { EnchantOption, TierOption } from "@/components/editor/tier-enchant";
import { useItemCatalogue } from "@/components/editor/use-item-catalogue";
import type { SpellGroup } from "@/types/build";
import { selectActions, selectBuild, useBuildStore } from "@/store/build-store";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { t } from "@/lib/i18n/messages";

type PickerTarget = { origin: "main"; slot: Slot } | { origin: "swap"; swapId: string; slot: Slot };

/**
 * `BuildCard`'s fixed logical width for the default `vertical` layout
 * (decision-010/doc-006) — it never shrinks with its flex parent. Used here
 * (not imported from `BuildCardVertical`, which keeps its own copy private)
 * to compute the scale-to-fit factor for the preview column below.
 */
const PREVIEW_CARD_WIDTH = 960;
/** `ThemePanel`'s fixed column width (`w-80`). */
const THEME_PANEL_WIDTH = 320;
/** Gap between the preview column and the docked panel (`gap-6`). */
const THEME_PANEL_GAP = 24;
/**
 * Below this scale factor a docked side-by-side panel would shrink the card
 * preview past legibility (ACM-095 round-2 review). At that point the panel
 * renders as a modal overlay instead of taking a column, so the card keeps
 * its full available width.
 */
const MIN_DOCK_SCALE = 0.7;

export type BuildEditorProps =
  | { mode: "new" }
  | { mode: "edit"; buildId: string; initialBuild: BuildState; initialTheme: BuildCardTheme };

/**
 * Owns the only store subscription in the editor tree. Slot cards and the
 * header receive plain props; they never import the store directly.
 *
 * Shared by `/build/new` and `/build/[id]/edit` (ACM-099) — the two routes
 * differ only in how the store/theme are seeded and which action `handleSave`
 * calls, everything else (layout, pickers, preview scaling) is identical.
 */
export function BuildEditor(props: BuildEditorProps): React.JSX.Element {
  const build = useBuildStore(selectBuild);
  const actions = useBuildStore(selectActions);
  const locale = useLocale();
  const router = useRouter();
  /**
   * ACM-100 AC#5: when this build is being created/edited from within a
   * comp's own page (`/comps/[id]`), that page links here with `comp`/
   * `compName` so the breadcrumb can show the comp -> build trail and link
   * back to it. Both params are required together — a bare `comp` id with
   * no display name isn't enough to render a link label without another
   * fetch, which this client route deliberately avoids. Read directly from
   * `window.location` (not `useSearchParams`) so this route never opts out
   * of static rendering / needs a `<Suspense>` boundary just for two rarely
   * present params. A lazy `useState` initializer (not an effect) reads it
   * once on mount — these params never change without a full navigation.
   */
  const [compTrail] = useState<{ name: string; href: string } | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const params = new URLSearchParams(window.location.search);
    const compId = params.get("comp");
    const compName = params.get("compName");
    return compId && compName ? { name: compName, href: `/comps/${compId}` } : undefined;
  });
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

  /**
   * The store is a module-level singleton (one instance for the whole app)
   * that survives client-side navigations. "edit" seeds it with the loaded
   * build's content: the `/build/[id]/edit` page wrapper renders this
   * component with `key={row.id}`, so switching which build is being edited
   * always remounts a fresh instance — this effect then hydrates it exactly
   * once per mount, never again on every keystroke. "new" must reset the
   * singleton instead of leaving it untouched (bugfix ACM-099 follow-up):
   * navigating from `/build/<id>/edit` to `/build/new` without a reset left
   * the previous build's data pre-filled in the "new" editor.
   */
  useEffect(() => {
    if (props.mode === "edit") {
      actions.hydrate(props.initialBuild);
    } else {
      actions.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per mount only (see doc comment above); `props`/`actions` intentionally excluded.
  }, []);

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
      map[item.uniquename] = resolveLocalizedName(item.localizedNames, locale) ?? item.uniquename;
    }
    return map;
  }, [items, locale]);

  const spellCandidatesByItemId = useMemo(() => {
    const map: Record<string, Partial<Record<SpellGroup, readonly SpellCandidate[]>>> = {};
    for (const item of items) {
      map[item.uniquename] = groupSpellsForItem(item, locale);
    }
    return map;
  }, [items, locale]);

  /**
   * `SlotGrid` (and the `SlotCard`s it renders) index item name and spell
   * candidates by `Slot`, not by uniquename — unlike `SwapsSection`, which
   * indexes by uniquename because a swap's item isn't one of the 10 fixed
   * slots. This adapts the uniquename-keyed lookups built above to the
   * slot-keyed shape `SlotGrid` expects, without recomputing
   * `groupSpellsForItem` per render (ACM-040).
   */
  const itemNamesBySlot = useMemo(() => {
    const map: Partial<Record<Slot, string>> = {};
    for (const slot of SLOT_ORDER) {
      const equipped = build.slots[slot];
      if (!equipped) continue;
      const name = itemNames[equipped.itemId];
      if (name !== undefined) map[slot] = name;
    }
    return map;
  }, [build.slots, itemNames]);

  /**
   * `BuildCard`'s lookups are keyed by uniquename (ACM-014), unlike the
   * slot-keyed maps above — derived from the same `spellCandidatesByItemId`
   * `SlotGrid` already needs, so no extra catalogue pass is required.
   */
  const cardLookups = useMemo(() => {
    const spellNames: Record<string, string> = {};
    const spellGroupsByItem: Record<string, SpellGroup[]> = {};
    for (const [itemId, grouped] of Object.entries(spellCandidatesByItemId)) {
      spellGroupsByItem[itemId] = Object.keys(grouped) as SpellGroup[];
      for (const candidates of Object.values(grouped)) {
        for (const candidate of candidates ?? []) {
          spellNames[candidate.uniquename] = candidate.name;
        }
      }
    }
    return { itemNames, spellNames, spellGroupsByItem };
  }, [itemNames, spellCandidatesByItemId]);

  /**
   * Lazy initializer, not a synced-by-effect value: the `key`-forced remount
   * described above already guarantees a fresh instance per build, so this
   * only ever needs to read `props` once, at mount.
   */
  const [theme, setTheme] = useState<BuildCardTheme>(() =>
    props.mode === "edit" ? props.initialTheme : DEFAULT_BUILD_CARD_THEME
  );
  const [themePanelOpen, setThemePanelOpen] = useState(false);
  /**
   * ACM-095 round 2: whether the appearance panel takes its own column next
   * to the card ("docked") or renders as a modal overlay ("overlay"). Chosen
   * from the row's real measured width, not a CSS breakpoint — see the
   * `ResizeObserver` effect below for the arithmetic.
   */
  const [panelMode, setPanelMode] = useState<"docked" | "overlay">("docked");
  /** Scale-to-fit factor applied to the card preview so it never overflows its column. */
  const [previewScale, setPreviewScale] = useState(1);
  /** Card's own unscaled layout height (`offsetHeight` — unaffected by the `transform: scale()` applied to the same node), used to reserve the correct (scaled) height for the preview wrapper instead of leaving a gap below it. */
  const [cardNaturalHeight, setCardNaturalHeight] = useState(0);
  const editorRowRef = useRef<HTMLDivElement | null>(null);
  const cardScaleRef = useRef<HTMLDivElement | null>(null);
  const showDockedPanel = themePanelOpen && panelMode === "docked";
  const showOverlayPanel = themePanelOpen && panelMode === "overlay";
  /** doc-007 §1.2/§1.3: below the docked-fit threshold the panel becomes a slide-over (`Sheet`) down to 768px, then a bottom `Drawer` below that (ACM-082). */
  const isMobile = useIsMobile();

  /**
   * Derives the panel mode and the card's scale-to-fit factor from
   * `window.innerWidth`, not from measuring the editor row's own
   * `clientWidth` (ACM-095 round 2 review-fix — a bare `overflow-x-auto`
   * previously hid part of the 960px card, and an initial attempt at this
   * fix measured the row itself, which back-fires: before the first
   * correction runs the row renders at the card's full unscaled width,
   * which is wider than the viewport, so flexbox's default
   * `min-width: auto` on the row lets it overflow its own parent instead of
   * shrinking — the "available width" it reports is then the inflated,
   * already-overflowing size, not the real one, and the scale computed from
   * it never corrects down. `window.innerWidth` cannot inflate that way, so
   * the arithmetic mirrors exactly what a human measures with the browser's
   * viewport width: `<main>`'s own `p-8` (32px each side) and (when the
   * panel is open) its raised `max-w-[1600px]` cap are the only two known
   * quantities subtracted from it.
   */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const MAIN_PADDING_X = 64; // p-8, both sides
    const MAIN_MAX_WIDTH_CLOSED = 1152; // max-w-6xl
    const MAIN_MAX_WIDTH_OPEN = 1600; // raised cap while the panel is open
    const update = (): void => {
      const mainCap = themePanelOpen ? MAIN_MAX_WIDTH_OPEN : MAIN_MAX_WIDTH_CLOSED;
      const mainWidth = Math.min(window.innerWidth, mainCap);
      const rowWidth = mainWidth - MAIN_PADDING_X;
      if (!themePanelOpen) {
        setPanelMode("docked");
        setPreviewScale(Math.min(1, rowWidth / PREVIEW_CARD_WIDTH));
        return;
      }
      const dockedAvailable = rowWidth - THEME_PANEL_WIDTH - THEME_PANEL_GAP;
      const dockedScale = Math.min(1, dockedAvailable / PREVIEW_CARD_WIDTH);
      if (dockedScale < MIN_DOCK_SCALE) {
        setPanelMode("overlay");
        setPreviewScale(Math.min(1, rowWidth / PREVIEW_CARD_WIDTH));
      } else {
        setPanelMode("docked");
        setPreviewScale(dockedScale);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [themePanelOpen]);

  useLayoutEffect(() => {
    const el = cardScaleRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = (): void => setCardNaturalHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);


  const spellCandidatesBySlot = useMemo(() => {
    const map: Partial<Record<Slot, Partial<Record<SpellGroup, readonly SpellCandidate[]>>>> = {};
    for (const slot of SLOT_ORDER) {
      const equipped = build.slots[slot];
      if (!equipped) continue;
      const candidates = spellCandidatesByItemId[equipped.itemId];
      if (candidates !== undefined) map[slot] = candidates;
    }
    return map;
  }, [build.slots, spellCandidatesByItemId]);

  const offhandLockBlocksPicker =
    pickerTarget?.origin === "main" && pickerTarget.slot === "offhand" && offhandLocked;
  const pickerOpen = Boolean(pickerTarget) && !offhandLockBlocksPicker;

  const filledCount = SLOT_ORDER.filter((slot) => build.slots[slot] !== null).length;
  /**
   * ACM-092 (revised spec): Salvar/Exportar require ≥1 equipped item that has
   * at least one selectable spell slot (per `groupSpellsForItem`'s ACM-090
   * exclusion, already reflected in `spellCandidatesBySlot`'s keys) AND has
   * every one of those selectable slots filled. Cape/bag/mount/food/potion
   * never contribute a selectable group, so equipping only those slots never
   * satisfies this on their own — a weapon in mainhand does, since ACM-089
   * auto-fills its single-candidate E.
   */
  const hasReadyItem = SLOT_ORDER.some((slot) => {
    const equipped = build.slots[slot];
    if (!equipped) return false;
    const selectableGroups = Object.keys(spellCandidatesBySlot[slot] ?? {}) as SpellGroup[];
    if (selectableGroups.length === 0) return false;
    return selectableGroups.every((group) => equipped.spells[group] !== null);
  });
  /**
   * Denominator for the mobile group-nav strip (ACM-041, doc-005 §7) and for
   * `EditorActionBar`'s slot counter (ACM-065): a locked offhand (two-handed
   * mainhand) is excluded from both its group's and the global total, not
   * counted as pending, so both counters agree and 9/9 (or 8/8 when
   * two-handed) is actually reachable.
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
   * ACM-014 wires the `BuildCard` preview into this ref (previously left
   * unattached — see git history). `EditorActionBar` only ever *reads*
   * `#capture-root` through this ref (decision-010); it never renders inside
   * it.
   */
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  const handleSave = useCallback(async () => {
    // ACM-018 landed `saveBuild` (Server Action, requireSession() + ownership
    // scoping — src/actions/builds.ts). "new" always creates a row; "edit"
    // (ACM-099) calls `updateBuild` against the id the route was loaded
    // with, so re-saving never creates a second row (AC#2).
    if (props.mode === "edit") {
      await updateBuild({
        id: props.buildId,
        name: build.name,
        role: build.role.trim() === "" ? null : build.role,
        content: JSON.stringify(build),
        theme: JSON.stringify(theme),
      });
      return;
    }
    // ACM-112: redirect to the newly created build's edit route so a second
    // click on Save (or any re-save) hits the `updateBuild` branch above
    // instead of `saveBuild` again, which would otherwise create a duplicate
    // row silently. Forward the current search params (`comp`/`compName`,
    // read in the lazy `compTrail` initializer above) so the "back to comp"
    // breadcrumb link survives the redirect.
    const row = await saveBuild({
      name: build.name,
      role: build.role.trim() === "" ? null : build.role,
      content: JSON.stringify(build),
      theme: JSON.stringify(theme),
    });
    router.push(`/build/${row.id}/edit${window.location.search}`);
  }, [build, theme, props, router]);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={`mx-auto flex w-full min-w-0 flex-col gap-6 p-8 pb-24 outline-none md:pb-8 ${themePanelOpen ? "max-w-[1600px]" : "max-w-6xl"}`}
    >
      <Breadcrumb current={build.name.trim() || t(locale, "editor.newBuild")} comp={compTrail} />
      <EditorActionBar
        buildName={build.name}
        filledCount={filledCount}
        totalSlots={totalReachableSlots}
        hasReadyItem={hasReadyItem}
        captureNodeRef={previewContainerRef}
        onSave={handleSave}
        themePanelOpen={themePanelOpen}
        onToggleThemePanel={() => setThemePanelOpen((open) => !open)}
      />
      {/*
        Marked inert while the picker is open so background content can't be
        tabbed/clicked into or announced by AT — it reinforces (but doesn't
        replace) the popover's own focus trap (ACM-034 follow-up review).
      */}
      <div ref={editorRowRef} inert={pickerOpen} className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/*
            ACM-095 round 2: a fixed `max-w-6xl` cap on `<main>` froze the
            preview column at 744px in every viewport once the panel opened,
            and a bare `overflow-x-auto` fallback hid part of the 960px-wide
            card behind a scrollbar instead of shrinking it. The wrapper here
            scales the card down to `previewScale` (never up — see the
            `ResizeObserver` effect above) so the whole card is always
            visible; `#capture-root` itself (inside `BuildCard`) keeps its
            hardcoded 960px logical width regardless of this ancestor's
            `transform`, which is what `html-to-image`/export reads (it
            clones `#capture-root`'s own subtree, not this ancestor, so the
            visual scale never reaches the exported PNG).
          */}
          <div ref={previewContainerRef} className="flex justify-center">
            <div
              style={{
                width: PREVIEW_CARD_WIDTH * previewScale,
                height: cardNaturalHeight > 0 ? cardNaturalHeight * previewScale : undefined,
              }}
            >
              <div
                ref={cardScaleRef}
                style={{ width: PREVIEW_CARD_WIDTH, transform: `scale(${previewScale})`, transformOrigin: "top left" }}
              >
                <BuildCard
                  state={build}
                  theme={theme}
                  itemNames={cardLookups.itemNames}
                  spellNames={cardLookups.spellNames}
                  spellGroupsByItem={cardLookups.spellGroupsByItem}
                />
              </div>
            </div>
          </div>
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
            itemNames={itemNamesBySlot}
            spellCandidatesBySlot={spellCandidatesBySlot}
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
        {showDockedPanel && (
          <div id="theme-panel">
            <ThemePanel theme={theme} onChange={setTheme} accent={build.accent} onAccentChange={actions.setAccent} />
          </div>
        )}
      </div>
      {/*
        ACM-095 round 2: below `MIN_DOCK_SCALE` a docked column would shrink
        the card past legibility, so the panel renders as an overlay instead
        — sanctioned by the task text's "drawer... OU um modal separado"
        alternative. ACM-082 replaced the hand-rolled dialog with shadcn's
        `Sheet` (tablet-width slide-over, doc-007 §1.2) and `Drawer`
        (mobile-width bottom sheet, doc-007 §1.3); both already close on
        Escape/backdrop click and animate open/close, respecting
        `prefers-reduced-motion`, without any custom code here.
      */}
      {isMobile ? (
        <Drawer open={showOverlayPanel} onOpenChange={(open) => setThemePanelOpen(open)}>
          <DrawerContent id="theme-panel">
            {/* Visually hidden: `ThemePanel`'s own heading is the visible title, this one only gives the dialog its required accessible name. */}
            <DrawerHeader className="sr-only">
              <DrawerTitle>{t(locale, "editor.appearance")}</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">
              <ThemePanel theme={theme} onChange={setTheme} accent={build.accent} onAccentChange={actions.setAccent} />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={showOverlayPanel} onOpenChange={(open) => setThemePanelOpen(open)}>
          <SheetContent id="theme-panel" className="overflow-y-auto">
            {/* Visually hidden: `ThemePanel`'s own heading is the visible title, this one only gives the dialog its required accessible name. */}
            <SheetHeader className="sr-only">
              <SheetTitle>{t(locale, "editor.appearance")}</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4">
              <ThemePanel theme={theme} onChange={setTheme} accent={build.accent} onAccentChange={actions.setAccent} />
            </div>
          </SheetContent>
        </Sheet>
      )}
      {pickerTarget && !offhandLockBlocksPicker && (
        <SlotPickerPopover
          slot={pickerTarget.slot}
          items={items}
          catalogueLoading={loading}
          catalogueFailed={failed}
          catalogueFailedReason={failedReason}
          onRetryCatalogue={retry}
          value={activeSlotItem?.itemId ?? null}
          label={getSlotLabels(locale)[pickerTarget.slot] ?? pickerTarget.slot}
          restoreFocusTo={triggerElement}
          onSelect={handleSelect}
          onClose={handleClosePicker}
        />
      )}
    </main>
  );
}
