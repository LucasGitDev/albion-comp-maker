import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyBuild } from "@/types/build";
import type { PublicBuild } from "@/lib/public-content";

const readFile = vi.fn();
const mockCookiesGet = vi.fn();

vi.mock("node:fs", () => {
  const promises = { readFile: (...args: unknown[]) => readFile(...args) };
  return { promises, default: { promises } };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mockCookiesGet })),
}));

const { mockGetPublicBuildBySlug } = vi.hoisted(() => ({
  mockGetPublicBuildBySlug: vi.fn(),
}));

vi.mock("@/lib/public-content", () => ({
  getPublicBuildBySlug: mockGetPublicBuildBySlug,
}));

function makePublicBuild(): PublicBuild {
  const content = createEmptyBuild();
  content.name = "Sword Build";
  content.slots.mainhand = {
    itemId: "T4_MAIN_SWORD",
    tier: 4,
    enchant: 0,
    spells: { q: null, w: null, e: null, passive: null },
    twohanded: false,
    maxEnchant: 4,
  };
  return {
    id: "build-1",
    name: "Sword Build",
    role: "dps",
    slug: "broadsword-abc123",
    content,
  };
}

/**
 * ACM-093 AC #2: proves the locale toggle's effect reaches the public SSR
 * page's rendered HTML, not just the client-side editor — this is the
 * scenario a shared `/build/[slug]` link relies on (no client JS required,
 * ACM-021), so the item name must already be correct in the server-rendered
 * output based on the `acm_locale` cookie alone.
 */
describe("public build page honors the acm_locale cookie in SSR (ACM-093)", () => {
  beforeEach(() => {
    vi.resetModules();
    readFile.mockReset();
    mockCookiesGet.mockReset();
    readFile.mockResolvedValue(
      JSON.stringify({
        version: "2026-01-01",
        items: [
          {
            uniquename: "T4_MAIN_SWORD",
            slot: "mainhand",
            localizedNames: { "EN-US": "Broadsword", "PT-BR": "Espada Larga" },
            twohanded: false,
            maxEnchant: 4,
            spells: [],
          },
        ],
        spells: {},
      })
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the pt-BR item name server-side when acm_locale=pt-BR", async () => {
    mockCookiesGet.mockReturnValue({ value: "pt-BR" });
    mockGetPublicBuildBySlug.mockResolvedValue(makePublicBuild());

    const { default: PublicBuildPage } = await import("@/app/build/[slug]/page");
    const element = await PublicBuildPage({ params: Promise.resolve({ slug: "broadsword-abc123" }) });
    const { container } = render(element);

    expect(container.textContent).toContain("Espada Larga");
    expect(container.textContent).not.toContain("Broadsword");
  });

  it("renders the en-US item name server-side when no cookie is set", async () => {
    mockCookiesGet.mockReturnValue(undefined);
    mockGetPublicBuildBySlug.mockResolvedValue(makePublicBuild());

    const { default: PublicBuildPage } = await import("@/app/build/[slug]/page");
    const element = await PublicBuildPage({ params: Promise.resolve({ slug: "broadsword-abc123" }) });
    const { container } = render(element);

    expect(container.textContent).toContain("Broadsword");
  });
});
