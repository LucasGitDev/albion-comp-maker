import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, normalizeLocale } from "@/lib/i18n/locales";

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
