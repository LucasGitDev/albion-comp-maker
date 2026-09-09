import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, FALLBACK_NAME_LOCALE, normalizeLocale } from "@/lib/i18n/locales";

describe("locale constants (ACM-093 visual-review fix)", () => {
  it("defaults the UI locale to pt-BR, matching the app's hardcoded PT-BR chrome", () => {
    expect(DEFAULT_LOCALE).toBe("pt-BR");
  });

  it("pins the name-resolution fallback to en-US regardless of the UI default", () => {
    expect(FALLBACK_NAME_LOCALE).toBe("en-US");
  });
});

describe("normalizeLocale", () => {
  it("accepts a supported locale regardless of casing", () => {
    expect(normalizeLocale("pt-br")).toBe("pt-BR");
    expect(normalizeLocale("PT-BR")).toBe("pt-BR");
    expect(normalizeLocale("en-US")).toBe("en-US");
  });

  it("falls back to the default locale for an unsupported value", () => {
    expect(normalizeLocale("fr-FR")).toBe(DEFAULT_LOCALE);
  });

  it("falls back to the default locale for undefined", () => {
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
  });

  it("falls back to the default locale for an empty string", () => {
    expect(normalizeLocale("")).toBe(DEFAULT_LOCALE);
  });
});
