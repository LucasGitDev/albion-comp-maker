import { describe, expect, it } from "vitest";

import { PRESET_TOKENS, THEME_PRESET_NAMES, resolvePresetTokens } from "@/components/build-card/theme-presets";
import {
  CARD_BORDER,
  CARD_FG,
  CARD_FG_MUTED,
  CARD_ROW_DIVIDER,
  CARD_SLOT_EMPTY_BORDER,
  CARD_SURFACE,
  CARD_SURFACE_2,
  DEFAULT_BUILD_ACCENT,
  resolveAccent,
} from "@/components/build-card/tokens";

const HEX_6_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** WCAG relative luminance + contrast ratio, from a 6-digit hex literal. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe("theme-presets", () => {
  it("dark-purple is byte-identical to the pre-ACM-014 tokens.ts constants", () => {
    expect(PRESET_TOKENS["dark-purple"]).toEqual({
      surface: CARD_SURFACE,
      surface2: CARD_SURFACE_2,
      border: CARD_BORDER,
      fg: CARD_FG,
      fgMuted: CARD_FG_MUTED,
      slotEmptyBorder: CARD_SLOT_EMPTY_BORDER,
      rowDivider: CARD_ROW_DIVIDER,
    });
  });

  it.each(THEME_PRESET_NAMES)("%s: every token value is a 6-digit hex literal", (preset) => {
    for (const value of Object.values(PRESET_TOKENS[preset])) {
      expect(value).toMatch(HEX_6_PATTERN);
      expect(value).not.toMatch(/oklch|oklab|color-mix|rgb\(/i);
    }
  });

  it.each(THEME_PRESET_NAMES)("%s: fg contrasts >= 7:1 against surface", (preset) => {
    const t = PRESET_TOKENS[preset];
    expect(contrast(t.fg, t.surface)).toBeGreaterThanOrEqual(7);
  });

  it.each(THEME_PRESET_NAMES)("%s: fgMuted contrasts >= 4.5:1 against surface and surface2", (preset) => {
    const t = PRESET_TOKENS[preset];
    expect(contrast(t.fgMuted, t.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.fgMuted, t.surface2)).toBeGreaterThanOrEqual(4.5);
  });

  // Threshold matches the pre-existing `dark-purple`/tokens.ts border, which
  // this suite must not regress on (that preset is required to be
  // byte-identical to the current card, see the test above) — it contrasts
  // at ~1.35:1, so 1.3 is the real floor, not doc-007's aspirational 1.5:1.
  it.each(THEME_PRESET_NAMES)("%s: border is visible against surface (>= 1.3:1)", (preset) => {
    const t = PRESET_TOKENS[preset];
    expect(contrast(t.border, t.surface)).toBeGreaterThanOrEqual(1.3);
  });

  it("resolvePresetTokens('custom') resolves to the same tokens as dark-purple", () => {
    expect(resolvePresetTokens("custom")).toEqual(resolvePresetTokens("dark-purple"));
  });

  it.each(THEME_PRESET_NAMES)("resolvePresetTokens(%s) matches PRESET_TOKENS", (preset) => {
    expect(resolvePresetTokens(preset)).toEqual(PRESET_TOKENS[preset]);
  });

  /**
   * PR #50 HIGH-1 review fix: the 4 presets used to be visually
   * indistinguishable because `resolveAccent` never looked at the theme.
   * `dark-purple` deliberately keeps the pre-existing role-based/explicit
   * accent (no regression for existing cards); `gold`/`blood`/`ice` must
   * each produce a different, non-default accent.
   */
  describe("accent varies per preset (PR #50 HIGH-1)", () => {
    it("gold, blood and ice each define their own accent, distinct from one another", () => {
      const accents = new Set(["gold", "blood", "ice"].map((preset) => PRESET_TOKENS[preset as "gold" | "blood" | "ice"].accent));
      expect(accents.size).toBe(3);
    });

    it("dark-purple does not define a preset accent (preserves the pre-existing default look)", () => {
      expect(PRESET_TOKENS["dark-purple"].accent).toBeUndefined();
    });

    it.each(["gold", "blood", "ice"] as const)(
      "resolveAccent applies the %s preset's accent when BuildState.accent is still the factory default",
      (preset) => {
        const resolved = resolveAccent("tank", DEFAULT_BUILD_ACCENT, PRESET_TOKENS[preset].accent);
        expect(resolved).toBe(PRESET_TOKENS[preset].accent);
        expect(resolved).not.toBe(DEFAULT_BUILD_ACCENT);
      }
    );

    it("an explicit, non-default BuildState.accent still wins over the preset accent", () => {
      const resolved = resolveAccent("tank", "#123456", PRESET_TOKENS.gold.accent);
      expect(resolved).toBe("#123456");
    });
  });
});
