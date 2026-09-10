import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyBuild } from "@/types/build";
import type { PublicBuild, PublicComp } from "@/lib/public-content";

const { mockGetPublicBuildBySlug, mockGetPublicCompBySlug } = vi.hoisted(() => ({
  mockGetPublicBuildBySlug: vi.fn(),
  mockGetPublicCompBySlug: vi.fn(),
}));

vi.mock("@/lib/public-content", () => ({
  getPublicBuildBySlug: mockGetPublicBuildBySlug,
  getPublicCompBySlug: mockGetPublicCompBySlug,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map([["host", "acm.example.com"]])),
}));

// `generateMetadata` only touches `public-content`/`request-origin`, but the
// page module itself also imports `GuestCTABanner` (ACM-117), which pulls in
// `@/auth` → next-auth's full runtime — unresolvable under vitest here, same
// as `public-pages.test.tsx`. Mocked for the same reason, not exercised by
// these metadata-only assertions.
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

vi.mock("@/lib/build-card-lookups", () => ({
  buildCardLookupsFor: vi.fn(async () => ({ itemNames: {}, spellNames: {}, spellGroupsByItem: {} })),
}));

vi.mock("@/lib/i18n/server-locale", () => ({
  getRequestLocale: vi.fn(async () => "en-US"),
}));

function makeBuild(): PublicBuild {
  const content = createEmptyBuild();
  content.name = "Fire Staff";
  return {
    id: "build-1",
    name: "Fire Staff",
    role: "dps",
    slug: "fire-staff-abc123",
    content,
    authorName: "Author Name",
  };
}

function makeComp(): PublicComp {
  return {
    id: "comp-1",
    name: "ZvZ Comp",
    slug: "zvz-comp-1",
    contentType: null,
    authorName: "Comp Author",
    entries: [{ compBuildId: "cb-0", position: 0, count: 1, label: null, build: makeBuild() }],
  };
}

describe("generateMetadata (ACM-022 AC#4)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sets og:image/og:title/og:description for a public build page", async () => {
    mockGetPublicBuildBySlug.mockResolvedValue(makeBuild());
    const { generateMetadata } = await import("@/app/build/[id]/page");

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "fire-staff-abc123" }) });

    expect(metadata.openGraph?.images).toEqual(["https://acm.example.com/api/og/build/fire-staff-abc123"]);
    expect(metadata.title).toBe("Fire Staff");
    expect(metadata.description).toContain("Author Name");
  });

  it("omits og:image for a private/nonexistent build slug", async () => {
    mockGetPublicBuildBySlug.mockResolvedValue(null);
    const { generateMetadata } = await import("@/app/build/[id]/page");

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "nope" }) });

    expect(metadata.openGraph).toBeUndefined();
  });

  it("sets og:image/og:title/og:description for a public comp page", async () => {
    mockGetPublicCompBySlug.mockResolvedValue(makeComp());
    const { generateMetadata } = await import("@/app/comp/[slug]/page");

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "zvz-comp-1" }) });

    expect(metadata.openGraph?.images).toEqual(["https://acm.example.com/api/og/comp/zvz-comp-1"]);
    expect(metadata.title).toBe("ZvZ Comp");
    expect(metadata.description).toContain("Fire Staff");
  });

  it("omits og:image for an unreachable comp slug", async () => {
    mockGetPublicCompBySlug.mockResolvedValue(null);
    const { generateMetadata } = await import("@/app/comp/[slug]/page");

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "nope" }) });

    expect(metadata.openGraph).toBeUndefined();
  });
});
