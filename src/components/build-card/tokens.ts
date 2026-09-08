/**
 * Hex-literal color tokens for BuildCard (ACM-013).
 *
 * BuildCard is the capture root for the PNG export (ACM-015, decision-007,
 * html-to-image). Tailwind v4's default palette utilities (e.g. `bg-blue-500`)
 * compile to `oklch()`, which html-to-image's foreignObject-based rasterizer
 * cannot parse — colors would silently vanish from the exported PNG. Every
 * color used inside `src/components/build-card/**` MUST come from this file
 * (or be an inline hex literal), never a Tailwind palette utility class.
 *
 * These are not added to `src/app/globals.css` because that file is outside
 * this task's authorized scope (see ACM-013 implementation notes) — the task
 * spec explicitly allows "inline hex arbitrary values" as an alternative to
 * new `@theme` tokens.
 */

import { ACCENT_HEX_PATTERN } from "@/lib/validation-constants";

export const CARD_SURFACE = "#12141a";
export const CARD_SURFACE_2 = "#171a21";
export const CARD_BORDER = "#2a2e37";
export const CARD_FG = "#ECEDEE";
export const CARD_FG_MUTED = "#9aa1ad";
export const CARD_PLACEHOLDER = "#2a2e37";

/**
 * Dashed border for an empty slot placeholder (Compressed §2.7, List §3.2).
 * `CARD_BORDER` (`#2a2e37`) is nearly invisible against `CARD_SURFACE_2`
 * (`#171a21`) — the empty state needs a lighter border to read as a slot at
 * all, not just a blank tile.
 */
export const CARD_SLOT_EMPTY_BORDER = "#3f4552";

/**
 * Divider between List rows (§3.1). `CARD_BORDER` is strong enough that
 * repeating it 10 times (one per slot) turns the card into a striped grid
 * instead of a plain list — this is the muted, single-purpose variant.
 */
export const CARD_ROW_DIVIDER = "#22262e";

/** Enchant badge color — same hex value as the `--color-enchant` token added by ACM-011. */
export const CARD_ENCHANT = "#3f8f4a";

/** Tier badge colors — same hex values as the `--color-tier-*` tokens added by ACM-011. */
export const TIER_COLORS: Readonly<Record<number, string>> = {
  4: "#557e98",
  5: "#934038",
  6: "#d8894c",
  7: "#e8c95f",
  8: "#d9d9e3",
};
export const TIER_COLOR_LOW = "#6b7280";

/** Badge text color for tier pills — kept dark so light tiers (7/8) stay legible. */
export const TIER_BADGE_TEXT = "#0b0d11";

/**
 * Badge text color for the enchant pill (ACM-080). `CARD_ENCHANT` (`#3f8f4a`)
 * is dark enough that white text stays legible, unlike the tier pills above
 * which span light and dark hues and need a fixed dark text color instead.
 */
export const CARD_ENCHANT_BADGE_TEXT = "#ffffff";

/** Default per-role accents, used only when `BuildState.accent` is absent/invalid. */
export const ROLE_ACCENTS: Readonly<Record<string, string>> = {
  tank: "#4a8fd4",
  healer: "#3f8f4a",
  dps: "#c8452f",
  support: "#a86fd4",
};

/**
 * `createEmptyBuild()`'s literal `accent` value (`src/types/build.ts`). It is
 * never absent (the field is required, not optional), so it can't act as a
 * "the user hasn't chosen yet" sentinel by mere presence — it needs a value
 * comparison instead. Exported so `resolveAccent`'s precedence rule (below)
 * and `createEmptyBuild()` never drift apart.
 */
export const DEFAULT_BUILD_ACCENT = "#3f8f4a";

/**
 * Resolves the card's accent color, always a hex literal, never oklch().
 *
 * Precedence (doc-007 §5 / PR #50 HIGH-1 review fix):
 *  1. `accent` — `BuildState.accent` — wins whenever it is a valid hex AND
 *     differs from `DEFAULT_BUILD_ACCENT`. That inequality is how we tell "the
 *     user picked a color" apart from "the field just holds its factory
 *     default"; the field itself is never `undefined`, so presence alone
 *     can't signal intent.
 *  2. `presetAccent` — the active theme preset's accent (`theme-presets.ts`).
 *     Only `gold`/`blood`/`ice` define one; `dark-purple` intentionally does
 *     not (see `theme-presets.ts` module doc), so applying the default preset
 *     never changes a single pixel of an existing saved card.
 *  3. Role-based fallback, same as before this task.
 */
export function resolveAccent(role: string, accent: string | undefined, presetAccent?: string): string {
  if (accent && ACCENT_HEX_PATTERN.test(accent) && accent !== DEFAULT_BUILD_ACCENT) return accent;
  if (presetAccent) return presetAccent;
  if (accent && ACCENT_HEX_PATTERN.test(accent)) return accent;
  return ROLE_ACCENTS[role.toLowerCase()] ?? ROLE_ACCENTS.tank;
}

export function tierColor(tier: number): string {
  return TIER_COLORS[tier] ?? TIER_COLOR_LOW;
}
