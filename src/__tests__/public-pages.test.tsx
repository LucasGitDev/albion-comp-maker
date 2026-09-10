import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

vi.mock("@/lib/build-card-lookups", () => ({
  buildCardLookupsFor: vi.fn(async () => ({ itemNames: {}, spellNames: {}, spellGroupsByItem: {} })),
}));

// `getRequestLocale` calls next/headers' `cookies()`, which throws outside a
// real request scope — mocked here since this suite isolates the page
// component, not the locale resolution itself (covered by
// `locale-toggle.test.tsx` and the SSR-locale case in this same file).
vi.mock("@/lib/i18n/server-locale", () => ({
  getRequestLocale: vi.fn(async () => "en-US"),
}));

// `GuestCTABanner` (ACM-117) calls `auth()`, which pulls in next-auth's
// full runtime (unavailable/unresolvable under vitest's jsdom environment).
// Mocked here since this suite isolates the page component, not auth
// resolution — the banner itself is unauthenticated in this suite's fixtures.
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
}));

function makePublicBuild(overrides: Partial<PublicBuild> = {}): PublicBuild {
  const content = createEmptyBuild();
  content.name = overrides.content?.name ?? "Fire Staff";
  return {
    id: "build-1",
    name: "Fire Staff",
    role: "dps",
    slug: "fire-staff-abc123",
    content,
    authorName: "Author Name",
    ...overrides,
  };
}

describe("public build page (ACM-021)", () => {
  it("renders a public build by slug", async () => {
    mockGetPublicBuildBySlug.mockResolvedValue(makePublicBuild());
    const { default: PublicBuildPage } = await import("@/app/build/[id]/page");

    const element = await PublicBuildPage({ params: Promise.resolve({ id: "fire-staff-abc123" }) });
    const { container } = render(element);

    expect(mockGetPublicBuildBySlug).toHaveBeenCalledWith("fire-staff-abc123");
    expect(container.querySelector("#capture-root")).not.toBeNull();
  });

  it("returns notFound() for a private/nonexistent/invalid slug", async () => {
    mockGetPublicBuildBySlug.mockResolvedValue(null);
    const { default: PublicBuildPage } = await import("@/app/build/[id]/page");

    await expect(PublicBuildPage({ params: Promise.resolve({ id: "private-or-missing" }) })).rejects.toMatchObject(
      { digest: "NEXT_HTTP_ERROR_FALLBACK;404" },
    );
  });
});

describe("public comp page (ACM-021)", () => {
  function makeComp(): PublicComp {
    const buildA = makePublicBuild({ id: "build-a", slug: "build-a", name: "Build A" });
    buildA.content.name = "Build A";
    const buildB = makePublicBuild({ id: "build-b", slug: "build-b", name: "Build B" });
    buildB.content.name = "Build B";

    return {
      id: "comp-1",
      name: "ZvZ Comp",
      slug: "zvz-comp-1",
      contentType: null,
      authorName: "Author Name",
      entries: [
        { compBuildId: "cb-0", position: 0, count: 1, label: "Front", build: buildA },
        { compBuildId: "cb-1", position: 1, count: 2, label: "Back", build: buildB },
      ],
    };
  }

  it("renders comp builds in position order", async () => {
    mockGetPublicCompBySlug.mockResolvedValue(makeComp());
    const { default: PublicCompPage } = await import("@/app/comp/[slug]/page");

    const element = await PublicCompPage({ params: Promise.resolve({ slug: "zvz-comp-1" }) });
    const { container } = render(element);

    const labels = Array.from(container.querySelectorAll("span")).map((el) => el.textContent);
    const frontIndex = labels.indexOf("Front");
    const backIndex = labels.indexOf("Back");
    expect(frontIndex).toBeGreaterThanOrEqual(0);
    expect(backIndex).toBeGreaterThan(frontIndex);
  });

  it("never emits duplicate capture-root ids for a comp with 2+ builds (ACM-021 review)", async () => {
    mockGetPublicCompBySlug.mockResolvedValue(makeComp());
    const { default: PublicCompPage } = await import("@/app/comp/[slug]/page");

    const element = await PublicCompPage({ params: Promise.resolve({ slug: "zvz-comp-1" }) });
    const { container } = render(element);

    const captureNodes = Array.from(container.querySelectorAll('[id^="capture-root"]'));
    const ids = captureNodes.map((node) => node.id);

    // ACM-020's CompExportView wraps the grid in its own
    // `#capture-root-full-comp` container, on top of the two per-entry
    // nodes below — 3 total, all distinct ids. None may share an id:
    // duplicate `id="capture-root"` is invalid HTML and makes
    // `getElementById`/`querySelector("#capture-root")` resolve to only the
    // first match, silently pointing export/capture logic at the wrong card.
    expect(ids.length).toBe(3);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("capture-root-full-comp");

    // Each card's own capture node must be reachable by its own id and
    // must contain that card's own content (not the other card's).
    const buildANode = container.querySelector("#capture-root-cb-0");
    const buildBNode = container.querySelector("#capture-root-cb-1");
    expect(buildANode).not.toBeNull();
    expect(buildBNode).not.toBeNull();
    expect(buildANode?.textContent).toContain("Build A");
    expect(buildANode?.textContent).not.toContain("Build B");
    expect(buildBNode?.textContent).toContain("Build B");
    expect(buildBNode?.textContent).not.toContain("Build A");
  });

  it("returns notFound() when the comp is unreachable (private build, missing, etc.)", async () => {
    mockGetPublicCompBySlug.mockResolvedValue(null);
    const { default: PublicCompPage } = await import("@/app/comp/[slug]/page");

    await expect(PublicCompPage({ params: Promise.resolve({ slug: "mixed-or-missing" }) })).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
  });
});
