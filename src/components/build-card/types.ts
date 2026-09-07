import type { SpellGroup } from "@/types/build";

/** Display-only theme toggles (ACM-014 wires these to real user controls). */
export type BuildCardTheme = {
  /** Show item names under each icon. Default: false (icon is the identifier). */
  showItemNames: boolean;
  /** Show spell names under each spell chip. Default: true. */
  showSpellNames: boolean;
};

export const DEFAULT_BUILD_CARD_THEME: BuildCardTheme = {
  showItemNames: false,
  showSpellNames: true,
};

/**
 * Read-only display data BuildCard needs but does not own: human-readable
 * names and which spell groups a given item actually exposes. BuildCard never
 * fetches or derives these itself (it has no store/catalog access — see
 * ACM-013 notes), so callers (the editor page, a Satori renderer, a test)
 * pass them in as plain lookups keyed by uniquename.
 */
export type BuildCardLookups = {
  itemNames: Partial<Record<string, string>>;
  spellNames: Partial<Record<string, string>>;
  spellGroupsByItem: Partial<Record<string, readonly SpellGroup[]>>;
};

export const EMPTY_LOOKUPS: BuildCardLookups = {
  itemNames: {},
  spellNames: {},
  spellGroupsByItem: {},
};

export const ALL_SPELL_GROUPS: readonly SpellGroup[] = ["q", "w", "e", "passive"] as const;

export type SpellGroupLabel = "Q" | "W" | "E" | "Passive";

export const SPELL_GROUP_ORDER: readonly { group: SpellGroup; label: SpellGroupLabel }[] = [
  { group: "q", label: "Q" },
  { group: "w", label: "W" },
  { group: "e", label: "E" },
  { group: "passive", label: "Passive" },
];
