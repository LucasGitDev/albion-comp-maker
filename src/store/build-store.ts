import { create } from "zustand";
import type { AOItem, Slot } from "@/data/ao-data";
import {
  EMPTY_SPELLS,
  type BuildState,
  type EquippedItem,
  type SpellGroup,
  createEmptyBuild,
} from "@/types/build";

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
  setItem(slot: Slot, item: Pick<AOItem, "uniquename" | "twohanded">, tier: number, enchant: 0 | 1 | 2 | 3 | 4): void;
  /**
   * Switch the equipped item's tier without touching its spells (ACM-009).
   * `itemId` is the sibling item's uniquename at `tier`, resolved by the
   * caller from the ao-data catalogue (see src/components/editor/tier-enchant.ts).
   */
  setTier(slot: Slot, tier: number, itemId: string): void;
  /**
   * Switch the equipped item's enchant level (ACM-031). Clamped to 0..4
   * regardless of what the caller passes — the store never trusts UI input
   * to already be in range, same rule as `setItem`/`setTier`.
   */
  setEnchant(slot: Slot, enchant: number): void;
  clearSlot(slot: Slot): void;
  setSpell(slot: Slot, group: SpellGroup, spellId: string | null): void;
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
        const clamped = Math.max(0, Math.min(4, Math.trunc(enchant))) as EquippedItem["enchant"];
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

    reset: () => set({ build: createEmptyBuild() }),
  },
}));
