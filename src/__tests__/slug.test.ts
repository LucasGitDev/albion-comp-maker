import { describe, expect, it } from "vitest";
import { generateSlug } from "@/lib/slug";

describe("generateSlug", () => {
  it("lowercases, hyphenates, and strips diacritics", () => {
    const slug = generateSlug("Fire Staff Café");
    expect(slug.startsWith("fire-staff-cafe-")).toBe(true);
  });

  it("falls back to the bare suffix when the name has no sluggable characters", () => {
    const slug = generateSlug("!!!");
    expect(slug).not.toContain("-");
    expect(slug.length).toBe(8);
  });
});
