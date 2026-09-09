import { describe, expect, it } from "vitest";
import {
  extractBackgroundImageId,
  parseThemeJson,
  validateThemeJsonForWrite,
} from "@/lib/theme-schema";
import { THEME_JSON_MAX_BYTES } from "@/lib/validation-constants";
import { DEFAULT_BUILD_CARD_THEME } from "@/components/build-card/types";

function validTheme(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    preset: "dark-purple",
    aspectRatio: "auto",
    fontFamily: "sans",
    showItemNames: false,
    showSpellNames: true,
    background: null,
    ...overrides,
  });
}

describe("theme-schema", () => {
  it("validateThemeJsonForWrite rejects a payload over the byte limit", () => {
    const oversized = validTheme({ preset: "custom".padEnd(THEME_JSON_MAX_BYTES + 100, "x") });
    expect(() => validateThemeJsonForWrite(oversized)).toThrow(/exceeds/);
  });

  it("validateThemeJsonForWrite accepts a well-formed theme", () => {
    const result = validateThemeJsonForWrite(validTheme());
    expect(JSON.parse(result).aspectRatio).toBe("auto");
  });

  it("parseThemeJson falls back to the default theme for null/undefined", () => {
    expect(parseThemeJson(null)).toEqual(DEFAULT_BUILD_CARD_THEME);
    expect(parseThemeJson(undefined)).toEqual(DEFAULT_BUILD_CARD_THEME);
  });

  it("parseThemeJson falls back to the default theme for an oversized payload", () => {
    const oversized = "x".repeat(THEME_JSON_MAX_BYTES + 1);
    expect(parseThemeJson(oversized)).toEqual(DEFAULT_BUILD_CARD_THEME);
  });

  it("parseThemeJson falls back to the default theme for invalid JSON", () => {
    expect(parseThemeJson("{not json")).toEqual(DEFAULT_BUILD_CARD_THEME);
  });

  it("parseThemeJson falls back to the default theme for a schema violation", () => {
    expect(parseThemeJson(JSON.stringify({ preset: "not-a-real-preset" }))).toEqual(
      DEFAULT_BUILD_CARD_THEME,
    );
  });

  it("parseThemeJson accepts a valid theme", () => {
    const parsed = parseThemeJson(validTheme({ fontFamily: "mono" }));
    expect(parsed.fontFamily).toBe("mono");
  });

  it("extractBackgroundImageId returns null when there is no background", () => {
    expect(extractBackgroundImageId(validTheme())).toBeNull();
  });

  it("extractBackgroundImageId returns the imageId when a background is set", () => {
    const theme = validTheme({
      background: { imageId: "img_abc", blur: 0, darken: 0.2, scale: 1 },
    });
    expect(extractBackgroundImageId(theme)).toBe("img_abc");
  });

  it("extractBackgroundImageId tolerates malformed input", () => {
    expect(extractBackgroundImageId("garbage")).toBeNull();
  });
});
