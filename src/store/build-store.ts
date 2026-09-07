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
   * the item is two-handed, "offhand" is cleared too — offhand becomes
   * locked in the UI whenever mainhand holds a two-handed item.
   */
  setItem(slot: Slot, item: Pick<AOItem, "uniquename" | "twohanded">, tier: number, enchant: 0 | 1 | 2 | 3 | 4): void;
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
        const equipped: EquippedItem = {
          itemId: item.uniquename,
          tier,
          enchant,
          spells: { ...EMPTY_SPELLS },
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
