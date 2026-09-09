import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCookiesGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mockCookiesGet })),
}));

/**
 * ACM-093 visual-review fix: a visitor with no `acm_locale` cookie must
 * resolve to `pt-BR`, matching the app's PT-BR-hardcoded chrome
 * (decision-026). Before this fix `DEFAULT_LOCALE` was `en-US`, so a
 * cookie-less visitor got an "EN" toggle marked active over an
 * entirely-Portuguese page.
 */
describe("getRequestLocale default (no cookie)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCookiesGet.mockReset();
    mockCookiesGet.mockReturnValue(undefined);
  });

  it("resolves to pt-BR when no acm_locale cookie is present", async () => {
    const { getRequestLocale } = await import("@/lib/i18n/server-locale");
    await expect(getRequestLocale()).resolves.toBe("pt-BR");
  });
});
