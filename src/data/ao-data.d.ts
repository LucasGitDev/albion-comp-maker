export type Slot = "mainhand" | "offhand" | "head" | "armor" | "shoes" | "cape" | "bag" | "mount" | "food" | "potion" | string;

export type AOSpell = {
  uniquename: string;
  slot: string; // "1" | "2" | "3" | "passive"
  localizedNames: Record<string, string>; // locale → name
};

export type AOItem = {
  uniquename: string;
  slot: Slot;
  localizedNames: Record<string, string>; // locale → name
  spells: AOSpell[];
};

export type AOData = {
  version: string; // ISO date of sync (e.g. "2024-01-15")
  items: AOItem[];
  spells: Record<string, AOSpell>; // keyed by uniquename
};
