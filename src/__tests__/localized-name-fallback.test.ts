import { describe, expect, it } from "vitest";

import { resolveLocalizedName } from "@/lib/localized-name";

describe("resolveLocalizedName", () => {
  it("returns the pt-BR name when present", () => {
    const names = { "EN-US": "Broadsword", "PT-BR": "Espada Larga" };
    expect(resolveLocalizedName(names, "pt-BR")).toBe("Espada Larga");
  });

  it("falls back to EN-US when pt-BR is absent (e.g. PASSIVE_AA_STACK)", () => {
    const names = { "EN-US": "Stacking Passive" };
    expect(resolveLocalizedName(names, "pt-BR")).toBe("Stacking Passive");
  });

  it("returns undefined when neither locale is present", () => {
    expect(resolveLocalizedName(undefined, "pt-BR")).toBeUndefined();
    expect(resolveLocalizedName({}, "pt-BR")).toBeUndefined();
  });

  it("resolves CDN casing (\"PT-BR\") when locale is \"pt-BR\"", () => {
    const names = { "PT-BR": "Espada Larga" };
    expect(resolveLocalizedName(names, "pt-BR")).toBe("Espada Larga");
  });
});
