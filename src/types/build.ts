import type { Slot } from "@/data/ao-data";

/** Spell group keys an item can expose. */
export type SpellGroup = "q" | "w" | "e" | "passive";

export type EquippedItem = {
  /** Full uniquename of the equipped item (includes tier/enchant encoding upstream, not here). */
  itemId: string;
  tier: number; // 1..8
  enchant: 0 | 1 | 2 | 3 | 4;
  spells: Record<SpellGroup, string | null>;
};

export type Swap = {
  id: string;
  label: string;
  slots: Partial<Record<Slot, EquippedItem | null>>;
};

export type BuildState = {
  schemaVersion: 1;
  name: string;
  role: string;
  accent: string; // hex literal, never oklch()
  slots: Record<Slot, EquippedItem | null>;
  swaps: Swap[];
};

/** The 10 equipment slots, in the visual order the editor and export share. */
export const SLOT_ORDER: readonly Slot[] = [
  "mainhand",
  "offhand",
  "head",
  "armor",
  "shoes",
  "cape",
  "bag",
  "mount",
  "food",
  "potion",
] as const;

/** Column grouping used by the editor grid and the exported card layout. */
export const SLOT_COLUMNS: readonly { title: string; slots: readonly Slot[] }[] = [
  { title: "Armas", slots: ["mainhand", "offhand"] },
  { title: "Armadura", slots: ["head", "armor", "shoes"] },
  { title: "Utilidade", slots: ["cape", "bag", "mount"] },
  { title: "Consumíveis", slots: ["food", "potion"] },
] as const;

export const EMPTY_SPELLS: Record<SpellGroup, string | null> = {
  q: null,
  w: null,
  e: null,
  passive: null,
};

export function createEmptyBuild(): BuildState {
  const slots = {} as Record<Slot, EquippedItem | null>;
  for (const slot of SLOT_ORDER) {
    slots[slot] = null;
  }
  return {
    schemaVersion: 1,
    name: "",
    role: "",
    accent: "#3f8f4a",
    slots,
    swaps: [],
  };
}
