import { describe, expect, it } from "vitest";

import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { MESSAGES, t, type MessageKey } from "@/lib/i18n/messages";

const ALL_KEYS: MessageKey[] = Object.keys(MESSAGES["en-US"]) as MessageKey[];

describe("i18n messages", () => {
  it("has every MessageKey present in every supported locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of ALL_KEYS) {
        expect(MESSAGES[locale]).toHaveProperty(key);
        expect(typeof MESSAGES[locale][key]).toBe("string");
        expect(MESSAGES[locale][key].length).toBeGreaterThan(0);
      }
    }
  });

  it("t() resolves the string for the given locale and key", () => {
    expect(t("en-US", "nav.myComps")).toBe("My comps");
    expect(t("pt-BR", "nav.myComps")).toBe("Minhas comps");
  });
});
