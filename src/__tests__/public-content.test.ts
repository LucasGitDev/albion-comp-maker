import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppDatabase } from "@/db/client";
import { createConnection, createDb } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { builds, comps, compBuilds, users } from "@/db/schema";

// Same reasoning as `builds-actions.test.ts`/`comps-actions.test.ts`:
// `getDb()` is a process-wide singleton, replaced with one bound to a
// throwaway test database.
vi.mock("@/db/client", async () => {
  const actual = await vi.importActual<typeof import("@/db/client")>("@/db/client");
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

/** Minimal payload that satisfies `buildStateSchema`'s strict shape. */
function validBuildContent(overrides: Record<string, unknown> = {}): string {
  const slots = {
    mainhand: null,
    offhand: null,
    head: null,
    armor: null,
    shoes: null,
    cape: null,
    bag: null,
    mount: null,
    food: null,
    potion: null,
  };
  return JSON.stringify({
    schemaVersion: 1,
    name: "Fire Staff",
    role: "dps",
    accent: "#3f8f4a",
    slots,
    swaps: [],
    ...overrides,
  });
}

describe("public-content (ACM-021 read-only public data access)", () => {
  let tmpDir: string;
  let dbPath: string;
  let db: AppDatabase;
  let sqlite: ReturnType<typeof createConnection>;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "acm-public-content-"));
    dbPath = path.join(tmpDir, "test.db");
    runMigrations(dbPath);
    sqlite = createConnection(dbPath);
    db = createDb(sqlite);

    const { getDb } = await import("@/db/client");
    vi.mocked(getDb).mockReturnValue(db);

    await db.insert(users).values([{ id: "user-a", name: "User A" }]);
  });

  afterEach(() => {
    sqlite.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe("getPublicBuildBySlug", () => {
    it("returns a public build's parsed content by slug", async () => {
      const { getPublicBuildBySlug } = await import("@/lib/public-content");

      await db.insert(builds).values({
        userId: "user-a",
        name: "Fire Staff",
        slug: "fire-staff-abc123",
        content: validBuildContent(),
        isPublic: true,
      });

      const result = await getPublicBuildBySlug("fire-staff-abc123");

      expect(result).not.toBeNull();
      expect(result?.name).toBe("Fire Staff");
      expect(result?.content.name).toBe("Fire Staff");
    });

    it("returns null for a private build (no existence oracle)", async () => {
      const { getPublicBuildBySlug } = await import("@/lib/public-content");

      await db.insert(builds).values({
        userId: "user-a",
        name: "Secret Build",
        slug: "secret-build-xyz789",
        content: validBuildContent({ name: "Secret Build" }),
        isPublic: false,
      });

      const result = await getPublicBuildBySlug("secret-build-xyz789");

      expect(result).toBeNull();
    });

    it("returns null for a nonexistent slug", async () => {
      const { getPublicBuildBySlug } = await import("@/lib/public-content");

      const result = await getPublicBuildBySlug("does-not-exist");

      expect(result).toBeNull();
    });

    it("returns null for a public build whose content fails parseBuildContent", async () => {
      const { getPublicBuildBySlug } = await import("@/lib/public-content");

      await db.insert(builds).values({
        userId: "user-a",
        name: "Corrupted",
        slug: "corrupted-build-111",
        content: "{ not: valid json",
        isPublic: true,
      });

      const result = await getPublicBuildBySlug("corrupted-build-111");

      expect(result).toBeNull();
    });
  });

  describe("getPublicCompBySlug", () => {
    it("returns a comp's builds in position order when every build is public", async () => {
      const { getPublicCompBySlug } = await import("@/lib/public-content");

      const [buildB] = await db
        .insert(builds)
        .values({
          userId: "user-a",
          name: "Build B",
          slug: "build-b-1",
          content: validBuildContent({ name: "Build B" }),
          isPublic: true,
        })
        .returning();
      const [buildA] = await db
        .insert(builds)
        .values({
          userId: "user-a",
          name: "Build A",
          slug: "build-a-1",
          content: validBuildContent({ name: "Build A" }),
          isPublic: true,
        })
        .returning();

      const [comp] = await db
        .insert(comps)
        .values({ userId: "user-a", name: "ZvZ Comp", slug: "zvz-comp-1", isPublic: true })
        .returning();

      // Inserted out of position order on purpose: position 1 (buildB)
      // first, position 0 (buildA) second — asserts the query sorts by
      // `position`, not insertion order (ACM-019).
      await db.insert(compBuilds).values({ compId: comp.id, buildId: buildB.id, position: 1, count: 1 });
      await db.insert(compBuilds).values({ compId: comp.id, buildId: buildA.id, position: 0, count: 1 });

      const result = await getPublicCompBySlug("zvz-comp-1");

      expect(result).not.toBeNull();
      expect(result?.entries.map((entry) => entry.build.name)).toEqual(["Build A", "Build B"]);
    });

    it("returns null when the comp has a private build (no partial render)", async () => {
      const { getPublicCompBySlug } = await import("@/lib/public-content");

      const [publicBuild] = await db
        .insert(builds)
        .values({
          userId: "user-a",
          name: "Public Build",
          slug: "public-build-1",
          content: validBuildContent({ name: "Public Build" }),
          isPublic: true,
        })
        .returning();
      const [privateBuild] = await db
        .insert(builds)
        .values({
          userId: "user-a",
          name: "Private Build",
          slug: "private-build-1",
          content: validBuildContent({ name: "Private Build" }),
          isPublic: false,
        })
        .returning();

      const [comp] = await db
        .insert(comps)
        .values({ userId: "user-a", name: "Mixed Comp", slug: "mixed-comp-1", isPublic: true })
        .returning();

      await db.insert(compBuilds).values({ compId: comp.id, buildId: publicBuild.id, position: 0, count: 1 });
      await db.insert(compBuilds).values({ compId: comp.id, buildId: privateBuild.id, position: 1, count: 1 });

      const result = await getPublicCompBySlug("mixed-comp-1");

      expect(result).toBeNull();
    });

    it("returns null for a nonexistent comp slug", async () => {
      const { getPublicCompBySlug } = await import("@/lib/public-content");

      const result = await getPublicCompBySlug("does-not-exist");

      expect(result).toBeNull();
    });

    it("returns null when comps.is_public is false, even if every referenced build is public (ACM-066, decision-025)", async () => {
      const { getPublicCompBySlug } = await import("@/lib/public-content");

      const [build] = await db
        .insert(builds)
        .values({
          userId: "user-a",
          name: "Public Build",
          slug: "public-build-not-shared",
          content: validBuildContent({ name: "Public Build" }),
          isPublic: true,
        })
        .returning();

      const [comp] = await db
        .insert(comps)
        .values({ userId: "user-a", name: "Not Shared Comp", slug: "not-shared-comp-1", isPublic: false })
        .returning();

      await db.insert(compBuilds).values({ compId: comp.id, buildId: build.id, position: 0, count: 1 });

      const result = await getPublicCompBySlug("not-shared-comp-1");

      expect(result).toBeNull();
    });

    it("returns the full comp when comps.is_public is true and every build is public and valid", async () => {
      const { getPublicCompBySlug } = await import("@/lib/public-content");

      const [build] = await db
        .insert(builds)
        .values({
          userId: "user-a",
          name: "Shared Build",
          slug: "shared-build-1",
          content: validBuildContent({ name: "Shared Build" }),
          isPublic: true,
        })
        .returning();

      const [comp] = await db
        .insert(comps)
        .values({ userId: "user-a", name: "Shared Comp", slug: "shared-comp-1", isPublic: true })
        .returning();

      await db.insert(compBuilds).values({ compId: comp.id, buildId: build.id, position: 0, count: 1 });

      const result = await getPublicCompBySlug("shared-comp-1");

      expect(result).not.toBeNull();
      expect(result?.entries).toHaveLength(1);
      expect(result?.entries[0]?.build.name).toBe("Shared Build");
    });

    it("returns null when comps.is_public is true but the referenced build's content fails parseBuildContent", async () => {
      const { getPublicCompBySlug } = await import("@/lib/public-content");

      const [build] = await db
        .insert(builds)
        .values({
          userId: "user-a",
          name: "Invalid Content Build",
          slug: "invalid-content-build-1",
          content: "not valid json {{{",
          isPublic: true,
        })
        .returning();

      const [comp] = await db
        .insert(comps)
        .values({ userId: "user-a", name: "Invalid Comp", slug: "invalid-comp-1", isPublic: true })
        .returning();

      await db.insert(compBuilds).values({ compId: comp.id, buildId: build.id, position: 0, count: 1 });

      const result = await getPublicCompBySlug("invalid-comp-1");

      expect(result).toBeNull();
    });
  });
});
