/**
 * Theme preset token sets (ACM-014, decision-017/decision-019, doc-007 §5).
 *
 * `BuildCard` is the capture root for the PNG export (decision-007). Every
 * value here MUST be a 6-digit hex literal — never a Tailwind palette class,
 * never `var(--...)`, never `oklch()`/`oklab()`/`color-mix()`. A `var()`
 * pointing at an oklch/oklab value in `globals.css` would pass the existing
 * render-time guard undetected (decision-017) and silently vanish from the
 * exported PNG.
 *
 * `accent` **is** part of each named preset's token set (except `dark-purple`,
 * see below) — PR #50 review (HIGH-1) found that decision-019's original
 * "accent lives only on `BuildState`" rule made the 4 presets visually
 * indistinguishable in the one place a comp leader looks first. `resolveAccent`
 * (`tokens.ts`) now takes an optional `presetAccent` and only falls back to it
 * when `BuildState.accent` is still at its factory default — see that
 * function's doc for the full precedence rule.
 *
 * `dark-purple`'s `surface`/`surface2`/`border`/`fg`/`fgMuted` are defined to
 * be byte-identical to the pre-ACM-014 constants in `tokens.ts`, so applying
 * the default preset never changes a single pixel of an existing card. This
 * is a deliberate, documented divergence from doc-007 §5.1's dark-purple hex
 * table (which uses `#16121f`/`#1e1830`/`#342a4a`/`#a79bbd`) — see
 * decision-020: the "default renders exactly as before" invariant was judged
 * more valuable than matching the spec's mock hex values for the one preset
 * that is also every existing card's implicit theme. `dark-purple` also does
 * NOT define an `accent` (see `DARK_PURPLE` below and `resolveAccent`), for
 * the same reason: forcing `#a86fd4` onto every role by default would be a
 * visible regression for every build that isn't `support`.
 */

import {
  CARD_BORDER,
  CARD_FG,
  CARD_FG_MUTED,
  CARD_ROW_DIVIDER,
  CARD_SLOT_EMPTY_BORDER,
  CARD_SURFACE,
  CARD_SURFACE_2,
} from "./tokens";
import type { BuildCardTheme } from "./types";

export type BuildCardTokenSet = {
  surface: string;
  surface2: string;
  border: string;
  fg: string;
  fgMuted: string;
  slotEmptyBorder: string;
  rowDivider: string;
  /**
   * Preset accent (doc-007 §5's `accent`/`accentFg` pair, `accentFg` omitted:
   * every current use of accent in `build-card/**` is text/fill color over
   * `surface`/`surface2`, never a filled pill needing a contrasting
   * foreground — see `BuildCardVertical`/`BuildCardCompressed`/`BuildCardList`).
   * `undefined` for `dark-purple` only — see module doc.
   */
  accent?: string;
};

const HEX_6_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const THEME_PRESET_NAMES = ["dark-purple", "gold", "blood", "ice"] as const;
export type NamedThemePreset = (typeof THEME_PRESET_NAMES)[number];

/** `dark-purple` reuses the existing card tokens verbatim — see module doc. */
const DARK_PURPLE: BuildCardTokenSet = {
  surface: CARD_SURFACE,
  surface2: CARD_SURFACE_2,
  border: CARD_BORDER,
  fg: CARD_FG,
  fgMuted: CARD_FG_MUTED,
  slotEmptyBorder: CARD_SLOT_EMPTY_BORDER,
  rowDivider: CARD_ROW_DIVIDER,
};

const GOLD: BuildCardTokenSet = {
  surface: "#1a1710",
  surface2: "#241f16",
  border: "#463a23",
  fg: "#F3EFE4",
  fgMuted: "#b3a582",
  slotEmptyBorder: "#5c4d2e",
  rowDivider: "#201c13",
  accent: "#e8c95f",
};

const BLOOD: BuildCardTokenSet = {
  surface: "#1a1113",
  surface2: "#25171a",
  border: "#4a2529",
  fg: "#F2E8E6",
  fgMuted: "#b89b98",
  slotEmptyBorder: "#603037",
  rowDivider: "#201417",
  accent: "#d9543c",
};

const ICE: BuildCardTokenSet = {
  surface: "#101820",
  surface2: "#17212c",
  border: "#27384a",
  fg: "#E6F0F5",
  fgMuted: "#94a9b8",
  slotEmptyBorder: "#33495e",
  rowDivider: "#141e27",
  accent: "#6fb7d4",
};

export const PRESET_TOKENS: Readonly<Record<NamedThemePreset, BuildCardTokenSet>> = {
  "dark-purple": DARK_PURPLE,
  gold: GOLD,
  blood: BLOOD,
  ice: ICE,
};

// Fails `tsc --noEmit`/tests if a future preset value regresses to a
// non-hex-literal format (decision-017 §5.5 item 6).
for (const tokens of Object.values(PRESET_TOKENS)) {
  for (const value of Object.values(tokens)) {
    // `accent` is `undefined` for `dark-purple` by design (see module doc) —
    // only defined values must be 6-digit hex literals.
    if (value !== undefined && !HEX_6_PATTERN.test(value)) {
      throw new Error(`theme-presets.ts: "${value}" is not a 6-digit hex literal`);
    }
  }
}

/**
 * Resolves a theme's `preset` to its full token set. `"custom"` is a derived
 * marker, not a distinct palette — it resolves to the same tokens as
 * `"dark-purple"` (doc-007 §9.2: the panel keeps whatever tokens were already
 * applied; this resolver is only the fallback used when nothing else is known).
 */
export function resolvePresetTokens(preset: BuildCardTheme["preset"]): BuildCardTokenSet {
  if (preset === "custom") return DARK_PURPLE;
  return PRESET_TOKENS[preset];
}

/**
 * Font stack for a theme's `fontFamily` (decision-017/doc-007 D4). Resolved
 * to a literal, OS-provided font stack — never a `var(--font-...)` custom
 * property (banned in `build-card/**` by decision-017) and never a webfont
 * fetched by URL at runtime: `html-to-image` cannot embed a cross-origin
 * stylesheet, and a `var()` pointing at `next/font`'s generated variable
 * would pass the static guard undetected. Using only generic/system font
 * families sidesteps both failure modes entirely.
 */
export function resolveFontFamily(fontFamily: BuildCardTheme["fontFamily"]): string {
  if (fontFamily === "mono") {
    return "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";
  }
  if (fontFamily === "serif") {
    // OS-provided serif stack, not the doc-007 §10 Cinzel webfont — see
    // `BuildCardTheme.fontFamily`'s doc for why real Cinzel is deferred.
    return "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif";
  }
  return "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
}
