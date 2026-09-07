export type Slot = "mainhand" | "offhand" | "head" | "armor" | "shoes" | "cape" | "bag" | "mount" | "food" | "potion" | string;

export type SpellKind = "active" | "passive" | "toggle";

/** A spell as attached to a specific item's resolved spell list. */
export type AOItemSpell = {
  uniquename: string;
  slotGroup: string; // index within the spell's own group, e.g. "1" | "2"
  kind: SpellKind;
  localizedNames: Record<string, string>; // locale → name
};

/** A spell as it appears in the global registry (no per-item slot). */
export type AOSpell = {
  uniquename: string;
  kind: SpellKind;
  localizedNames: Record<string, string>; // locale → name
};

export type AOItem = {
  uniquename: string;
  slot: Slot;
  localizedNames: Record<string, string>; // locale → name
  spells: AOItemSpell[];
};

export type AOData = {
  version: string; // ISO date of sync (e.g. "2024-01-15")
  items: AOItem[];
  spells: Record<string, AOSpell>; // keyed by uniquename
};
