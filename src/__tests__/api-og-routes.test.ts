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

function makeBuild(overrides: Partial<PublicBuild> = {}): PublicBuild {
  const content = createEmptyBuild();
  content.name = "Fire Staff";
  content.slots.mainhand = {
    itemId: "T4_MAIN_FIRESTAFF",
    tier: 4,
    enchant: 0,
    spells: { q: null, w: null, e: null, passive: null },
    twohanded: true,
    maxEnchant: 4,
  };
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

function makeComp(overrides: Partial<PublicComp> = {}): PublicComp {
  const build = makeBuild();
  return {
    id: "comp-1",
    name: "ZvZ Comp",
    slug: "zvz-comp-1",
    contentType: null,
    authorName: "Comp Author",
    entries: [{ compBuildId: "cb-0", position: 0, count: 1, label: "Front", build }],
    ...overrides,
  };
}

describe("GET /api/og/build/[slug]", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns a 200 PNG with correct Content-Type and Cache-Control for a public build", async () => {
    mockGetPublicBuildBySlug.mockResolvedValue(makeBuild());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }),
    );

    const { GET } = await import("@/app/api/og/build/[slug]/route");
    const response = await GET(new Request("http://localhost/api/og/build/fire-staff-abc123"), {
      params: Promise.resolve({ slug: "fire-staff-abc123" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
  });

  it("returns an identical 404 for a private, nonexistent, or invalid-content slug", async () => {
    mockGetPublicBuildBySlug.mockResolvedValue(null);

    const { GET } = await import("@/app/api/og/build/[slug]/route");
    const response = await GET(new Request("http://localhost/api/og/build/nope"), {
      params: Promise.resolve({ slug: "nope" }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).not.toBe(
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
  });

  it("does not 500 when the upstream icon fetch fails (fallback transparent PNG)", async () => {
    mockGetPublicBuildBySlug.mockResolvedValue(makeBuild());
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { GET } = await import("@/app/api/og/build/[slug]/route");
    const response = await GET(new Request("http://localhost/api/og/build/fire-staff-abc123"), {
      params: Promise.resolve({ slug: "fire-staff-abc123" }),
    });

    expect(response.status).toBe(200);
  });
});

describe("GET /api/og/comp/[slug]", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns a 200 PNG with correct Content-Type and Cache-Control for a public comp", async () => {
    mockGetPublicCompBySlug.mockResolvedValue(makeComp());
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }),
    );

    const { GET } = await import("@/app/api/og/comp/[slug]/route");
    const response = await GET(new Request("http://localhost/api/og/comp/zvz-comp-1"), {
      params: Promise.resolve({ slug: "zvz-comp-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );
  });

  it("returns an identical 404 for a private, nonexistent, or unreachable comp slug", async () => {
    mockGetPublicCompBySlug.mockResolvedValue(null);

    const { GET } = await import("@/app/api/og/comp/[slug]/route");
    const response = await GET(new Request("http://localhost/api/og/comp/nope"), {
      params: Promise.resolve({ slug: "nope" }),
    });

    expect(response.status).toBe(404);
  });

  it("does not 500 when the upstream icon fetch fails (fallback transparent PNG)", async () => {
    mockGetPublicCompBySlug.mockResolvedValue(makeComp());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) }));

    const { GET } = await import("@/app/api/og/comp/[slug]/route");
    const response = await GET(new Request("http://localhost/api/og/comp/zvz-comp-1"), {
      params: Promise.resolve({ slug: "zvz-comp-1" }),
    });

    expect(response.status).toBe(200);
  });
});
