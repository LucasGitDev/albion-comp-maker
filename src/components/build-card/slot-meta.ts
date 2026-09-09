import type { IconCategory } from "@/components/icons/category-glyphs";
import type { Slot } from "@/data/ao-data";

/**
 * Display labels for per-slot text across layouts (doc-006 §3.1). `CardSlotTile`
 * used to keep its own copy (doc-006 §5 kept it out of that task's scope);
 * ACM-092 unified both on this one so the Vertical/Grid layouts' new
 * empty-slot placeholders can't drift from the List/Compressed labels.
 */
export const SLOT_LABELS: Record<Slot, string> = {
  mainhand: "Mão principal",
  offhand: "Mão secundária",
  head: "Cabeça",
  armor: "Peito",
  shoes: "Botas",
  cape: "Capa",
  bag: "Bolsa",
  mount: "Montaria",
  food: "Comida",
  potion: "Poção",
};

/**
 * Per-slot glyph category for empty-slot placeholders (doc-006 §2.7, §3.2),
 * matching the mapping `SlotCard` uses for the editor's own empty state so
 * the Compressed/List placeholder glyphs never drift from the editor's.
 */
export const SLOT_CATEGORY: Record<Slot, Exclude<IconCategory, "generic">> = {
  mainhand: "weapon",
  offhand: "weapon",
  head: "armor",
  armor: "armor",
  shoes: "armor",
  cape: "utility",
  bag: "utility",
  mount: "utility",
  food: "consumable",
  potion: "consumable",
};
