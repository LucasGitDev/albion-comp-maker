import type { Slot } from "@/data/ao-data";

/** Spell group keys an item can expose. */
export type SpellGroup = "q" | "w" | "e" | "passive";

export type EquippedItem = {
  /** Full uniquename of the equipped item (includes tier/enchant encoding upstream, not here). */
  itemId: string;
  tier: number; // 1..8
  enchant: 0 | 1 | 2 | 3 | 4;
  spells: Record<SpellGroup, string | null>;
  /**
   * `AOItem.twohanded` at equip time. Only meaningful on `mainhand`, but
   * kept on every slot so the store can enforce the two-handed/offhand
   * lock rule (ACM-011 review finding) without needing catalog access —
   * `slots.mainhand` is the only place that fact is available once equipped.
   */
  twohanded: boolean;
  /**
   * `AOItem.maxEnchant` at equip time (ACM-031 review fix). Kept on the
   * slot for the same reason as `twohanded`: the store has no catalog
   * access at the point `setEnchant` runs, so it cannot otherwise know the
   * real per-item enchant ceiling. Without this, `setEnchant` could only
   * clamp to a hardcoded constant, which would let it accept an enchant the
   * real item data does not support (decision-011).
   */
  maxEnchant: number;
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

/**
 * Column grouping used by the editor grid and the exported card layout.
 * `id` is the anchor target for the mobile group-nav strip (ACM-041) —
 * stable ASCII slugs so `#slot-group-<id>` never depends on the
 * (accented, PT-BR) display title.
 */
export const SLOT_COLUMNS: readonly { id: string; title: string; slots: readonly Slot[] }[] = [
  { id: "armas", title: "Armas", slots: ["mainhand", "offhand"] },
  { id: "armadura", title: "Armadura", slots: ["head", "armor", "shoes"] },
  { id: "utilidade", title: "Utilidade", slots: ["cape", "bag", "mount"] },
  { id: "consumiveis", title: "Consumíveis", slots: ["food", "potion"] },
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
