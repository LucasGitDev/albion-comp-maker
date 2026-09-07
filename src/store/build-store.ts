import { nanoid } from "nanoid";
import { create } from "zustand";
import type { AOItem, Slot } from "@/data/ao-data";
import {
  EMPTY_SPELLS,
  type BuildState,
  type EquippedItem,
  type SpellGroup,
  type Swap,
  createEmptyBuild,
} from "@/types/build";

/**
 * Hard cap on the number of swaps a build can hold, mirrored from
 * `buildStateSchema`'s `swaps: z.array(swapSchema).max(20)`
 * (`src/lib/build-schema.ts`, ACM-049). Enforced here — not only by
 * disabling the "Adicionar swap" button in the UI — so a bypassed/future UI
 * path can never persist a build the write schema would reject (ACM-012,
 * mirrors the ACM-031 review finding about UI-only guards).
 */
export const MAX_SWAPS = 20;

export type BuildActions = {
  setName(name: string): void;
  setRole(role: string): void;
  setAccent(accent: string): void;
  /**
   * Equip `item` into `slot`. Always resets that slot's spells (the previous
   * item's spells do not exist on the new item). If `slot` is "mainhand" and
   * the item is two-handed, "offhand" is cleared too. Conversely, if `slot`
   * is "offhand" while mainhand already holds a two-handed item, the call is
   * a no-op — offhand is locked in the store itself, not only in the UI.
   */
  setItem(
    slot: Slot,
    item: Pick<AOItem, "uniquename" | "twohanded" | "maxEnchant">,
    tier: number,
    enchant: 0 | 1 | 2 | 3 | 4
  ): void;
  /**
   * Switch the equipped item's tier without touching its spells (ACM-009).
   * `itemId` is the sibling item's uniquename at `tier`, resolved by the
   * caller from the ao-data catalogue (see src/components/editor/tier-enchant.ts).
   */
  setTier(slot: Slot, tier: number, itemId: string): void;
  /**
   * Switch the equipped item's enchant level (ACM-031). Clamped to
   * `0..slot.maxEnchant` — the item's own real ceiling, persisted on the
   * slot at equip time (`EquippedItem.maxEnchant`) — regardless of what the
   * caller passes. The store never trusts UI input to already be in range,
   * same rule as `setItem`/`setTier`; a hardcoded `0..4` clamp would still
   * let e.g. a maxEnchant-0 item accept enchant 3 (review finding).
   */
  setEnchant(slot: Slot, enchant: number): void;
  clearSlot(slot: Slot): void;
  setSpell(slot: Slot, group: SpellGroup, spellId: string | null): void;
  /**
   * Appends a new swap row (ACM-012, RF-3) targeting `mainhand` with no
   * item yet and an empty label. The label is intentionally left empty
   * (not pre-filled with a placeholder-like default such as "Novo swap")
   * so the input's real placeholder — "Quando usar? ex.: fights de
   * bridge" — stays visible until the leader types something (ACM-012
   * review round 2). An empty label is a valid, persistable value —
   * `swapSchema.label` allows `""` (ACM-012 review round 3, relaxed from
   * `min(1)`/ACM-049) precisely so a swap can be saved without ever
   * touching the label field. `SwapRow` still substitutes a friendly
   * default on blur-if-empty purely for display/UX, not for validity. A
   * no-op once `MAX_SWAPS` is reached.
   */
  addSwap(): void;
  removeSwap(id: string): void;
  /** Reorders `swaps` by moving `id` one position toward the front/back. No-op at either boundary. */
  moveSwap(id: string, direction: "up" | "down"): void;
  /**
   * Writes `label` verbatim, including `""` while the leader is mid-edit
   * (e.g. selecting all text and typing over it) or on save. Previously
   * this coerced an empty value to a single space on every keystroke
   * (ACM-060), which silently swallowed the "empty" state and made it
   * impossible to clear the field to type fresh text. `""` is a valid,
   * persistable label — `swapSchema.label` allows it (ACM-012 review
   * round 3) — so there is no invariant to protect here; `SwapRow`'s
   * blur-if-empty default is purely cosmetic, not a validity guard.
   */
  setSwapLabel(id: string, label: string): void;
  /**
   * Points `id`'s swap at `slot`, replacing whatever slot it previously
   * targeted (a swap targets exactly one slot in this UI, even though the
   * persisted shape is a `Partial<Record<Slot, ...>>` — decision left for
   * a future multi-slot swap UI). Clears any previously equipped item.
   */
  setSwapSlot(id: string, slot: Slot): void;
  setSwapItem(
    id: string,
    slot: Slot,
    item: Pick<AOItem, "uniquename" | "twohanded" | "maxEnchant">,
    tier: number,
    enchant: 0 | 1 | 2 | 3 | 4
  ): void;
  setSwapSpell(id: string, slot: Slot, group: SpellGroup, spellId: string | null): void;
  reset(): void;
};

export type BuildStore = {
  build: BuildState;
  actions: BuildActions;
};

export const selectBuild = (state: BuildStore): BuildState => state.build;
export const selectActions = (state: BuildStore): BuildActions => state.actions;

export const useBuildStore = create<BuildStore>((set) => ({
  build: createEmptyBuild(),
  actions: {
    setName: (name) =>
      set((state) => ({ build: { ...state.build, name } })),

    setRole: (role) =>
      set((state) => ({ build: { ...state.build, role } })),

    setAccent: (accent) =>
      set((state) => ({ build: { ...state.build, accent } })),

    setItem: (slot, item, tier, enchant) =>
      set((state) => {
        if (slot === "offhand" && state.build.slots.mainhand?.twohanded) {
          // Mainhand already holds a two-handed weapon: offhand stays
          // locked. Enforced here, not only in the UI, per ACM-011 review.
          return {};
        }

        const equipped: EquippedItem = {
          itemId: item.uniquename,
          tier,
          enchant,
          spells: { ...EMPTY_SPELLS },
          twohanded: item.twohanded,
          maxEnchant: item.maxEnchant,
        };
        const slots: Record<Slot, EquippedItem | null> = {
          ...state.build.slots,
          [slot]: equipped,
        };
        if (slot === "mainhand" && item.twohanded) {
          slots.offhand = null;
        }
        return { build: { ...state.build, slots } };
      }),

    setTier: (slot, tier, itemId) =>
      set((state) => {
        const current = state.build.slots[slot];
        if (!current) return {};
        const slots: Record<Slot, EquippedItem | null> = {
          ...state.build.slots,
          [slot]: { ...current, tier, itemId },
        };
        return { build: { ...state.build, slots } };
      }),

    setEnchant: (slot, enchant) =>
      set((state) => {
        const current = state.build.slots[slot];
        if (!current) return {};
        const clamped = Math.max(
          0,
          Math.min(current.maxEnchant, Math.trunc(enchant))
        ) as EquippedItem["enchant"];
        const slots: Record<Slot, EquippedItem | null> = {
          ...state.build.slots,
          [slot]: { ...current, enchant: clamped },
        };
        return { build: { ...state.build, slots } };
      }),

    clearSlot: (slot) =>
      set((state) => ({
        build: {
          ...state.build,
          slots: { ...state.build.slots, [slot]: null },
        },
      })),

    setSpell: (slot, group, spellId) =>
      set((state) => {
        const current = state.build.slots[slot];
        if (!current) return {};
        const slots: Record<Slot, EquippedItem | null> = {
          ...state.build.slots,
          [slot]: {
            ...current,
            spells: { ...current.spells, [group]: spellId },
          },
        };
        return { build: { ...state.build, slots } };
      }),

    addSwap: () =>
      set((state) => {
        if (state.build.swaps.length >= MAX_SWAPS) return {};
        const swap: Swap = {
          id: nanoid(),
          label: "",
          slots: { mainhand: null },
        };
        return { build: { ...state.build, swaps: [...state.build.swaps, swap] } };
      }),

    removeSwap: (id) =>
      set((state) => ({
        build: { ...state.build, swaps: state.build.swaps.filter((swap) => swap.id !== id) },
      })),

    moveSwap: (id, direction) =>
      set((state) => {
        const swaps = state.build.swaps;
        const index = swaps.findIndex((swap) => swap.id === id);
        if (index === -1) return {};
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= swaps.length) return {};

        const next = [...swaps];
        const [moved] = next.splice(index, 1);
        next.splice(target, 0, moved);
        return { build: { ...state.build, swaps: next } };
      }),

    setSwapLabel: (id, label) =>
      set((state) => ({
        build: {
          ...state.build,
          swaps: state.build.swaps.map((swap) => (swap.id === id ? { ...swap, label } : swap)),
        },
      })),

    setSwapSlot: (id, slot) =>
      set((state) => ({
        build: {
          ...state.build,
          swaps: state.build.swaps.map((swap) => (swap.id === id ? { ...swap, slots: { [slot]: null } } : swap)),
        },
      })),

    setSwapItem: (id, slot, item, tier, enchant) =>
      set((state) => {
        const equipped: EquippedItem = {
          itemId: item.uniquename,
          tier,
          enchant,
          spells: { ...EMPTY_SPELLS },
          twohanded: item.twohanded,
          maxEnchant: item.maxEnchant,
        };
        return {
          build: {
            ...state.build,
            swaps: state.build.swaps.map((swap) =>
              swap.id === id ? { ...swap, slots: { [slot]: equipped } } : swap
            ),
          },
        };
      }),

    setSwapSpell: (id, slot, group, spellId) =>
      set((state) => ({
        build: {
          ...state.build,
          swaps: state.build.swaps.map((swap) => {
            if (swap.id !== id) return swap;
            const current = swap.slots[slot];
            if (!current) return swap;
            return {
              ...swap,
              slots: { ...swap.slots, [slot]: { ...current, spells: { ...current.spells, [group]: spellId } } },
            };
          }),
        },
      })),

    reset: () => set({ build: createEmptyBuild() }),
  },
}));
