import type { SpellGroup } from "@/types/build";

/**
 * Background image layer for the card (ACM-014, decision-018/decision-019).
 * `imageId` references a row in `background_images` — the theme never stores
 * a path or a dataURL, only the opaque id. The client resolves the actual
 * `<img src>` as `/api/background/${imageId}`.
 */
export type BuildCardBackground = {
  imageId: string;
  /** 0..20 px, applied as `filter: blur(Npx)` on the image layer only. */
  blur: number;
  /** 0..0.9, opacity of the black overlay drawn between the image and the content. */
  darken: number;
  /** 1..2.5, applied as `transform: scale(N)` on the image layer. */
  scale: number;
};

/**
 * BuildCard's full theme contract (ACM-014, decision-019). `preset` selects
 * the token set from `theme-presets.ts`; `"custom"` is a derived marker (the
 * user changed something after applying a named preset) and resolves to the
 * same tokens as `"dark-purple"` — see `resolvePresetTokens`.
 */
export type BuildCardTheme = {
  preset: "dark-purple" | "gold" | "blood" | "ice" | "custom";
  aspectRatio: "square" | "wide" | "auto";
  /** Same-origin font stacks only (`next/font` Geist) — see decision-017/doc-007 D4. */
  fontFamily: "sans" | "mono";
  /** Show item names under each icon. Default: false (icon is the identifier). */
  showItemNames: boolean;
  /** Show spell names under each spell chip. Default: true. */
  showSpellNames: boolean;
  background: BuildCardBackground | null;
};

export const DEFAULT_BUILD_CARD_THEME: BuildCardTheme = {
  preset: "dark-purple",
  aspectRatio: "auto",
  fontFamily: "sans",
  showItemNames: false,
  showSpellNames: true,
  background: null,
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
