import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppDatabase } from "@/db/client";
import { createConnection, createDb } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { builds, users } from "@/db/schema";
import { __resetRateLimitState } from "@/lib/rate-limit";

const { mockRequireSession } = vi.hoisted(() => ({
  mockRequireSession: vi.fn(),
}));

vi.mock("@/auth/session", () => ({
  requireSession: mockRequireSession,
}));

// Same reasoning as `builds-actions.test.ts`: `getDb()` is a process-wide
// singleton, so it's replaced with one bound to a throwaway test database.
vi.mock("@/db/client", async () => {
  const actual = await vi.importActual<typeof import("@/db/client")>("@/db/client");
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

function sessionFor(userId: string) {
  return { user: { id: userId }, expires: "" };
}

describe("comp Server Actions (ACM-019)", () => {
  let tmpDir: string;
  let dbPath: string;
  let db: AppDatabase;
  let sqlite: ReturnType<typeof createConnection>;

  beforeEach(async () => {
    __resetRateLimitState();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "acm-comps-actions-"));
    dbPath = path.join(tmpDir, "test.db");
    runMigrations(dbPath);
    sqlite = createConnection(dbPath);
    db = createDb(sqlite);

    const { getDb } = await import("@/db/client");
    vi.mocked(getDb).mockReturnValue(db);

    await db.insert(users).values([
      { id: "user-a", name: "User A" },
      { id: "user-b", name: "User B" },
    ]);

    mockRequireSession.mockReset();
  });

  afterEach(() => {
    sqlite.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  describe("unauthenticated calls", () => {
    it("every exported action rejects when there is no session, regardless of middleware", async () => {
      mockRequireSession.mockRejectedValue(new Error("Unauthorized"));
      const actions = await import("@/actions/comps");

      await expect(actions.createComp({ name: "Group A" })).rejects.toThrow("Unauthorized");
      await expect(actions.listMyComps()).rejects.toThrow("Unauthorized");
      await expect(actions.listCompBuilds("x")).rejects.toThrow("Unauthorized");
      await expect(actions.updateComp({ id: "x", name: "y" })).rejects.toThrow("Unauthorized");
      await expect(actions.deleteComp("x")).rejects.toThrow("Unauthorized");
      await expect(actions.addBuildToComp({ compId: "x", buildId: "y" })).rejects.toThrow("Unauthorized");
      await expect(actions.removeBuildFromComp("x", "y")).rejects.toThrow("Unauthorized");
      await expect(actions.updateCompBuild({ compId: "x", compBuildId: "y", label: "z" })).rejects.toThrow(
        "Unauthorized",
      );
      await expect(actions.reorderCompBuilds("x", [])).rejects.toThrow("Unauthorized");
    });
  });

  describe("createComp", () => {
    it("creates a row with a nanoid id and an immutable slug derived from the name", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp } = await import("@/actions/comps");

      const comp = await createComp({ name: "ZvZ Comp" });

      expect(comp.id).toBeTruthy();
      expect(comp.slug.startsWith("zvz-comp-")).toBe(true);
      expect(comp.userId).toBe("user-a");
    });
  });

  describe("ownership scoping (IDOR)", () => {
    it("user B cannot see user A's comp via listMyComps", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp, listMyComps } = await import("@/actions/comps");
      await createComp({ name: "Private Comp" });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      const bComps = await listMyComps();

      expect(bComps).toHaveLength(0);
    });

    it("user B cannot update user A's comp", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp, updateComp } = await import("@/actions/comps");
      const comp = await createComp({ name: "Original" });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      await expect(updateComp({ id: comp.id, name: "Hijacked" })).rejects.toThrow("Comp not found");
    });

    it("user B cannot delete user A's comp", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp, deleteComp, listMyComps } = await import("@/actions/comps");
      const comp = await createComp({ name: "Original" });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      await expect(deleteComp(comp.id)).rejects.toThrow("Comp not found");

      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      expect(await listMyComps()).toHaveLength(1);
    });

    it("user B cannot attach their own private build to user A's comp (comp not owned)", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp } = await import("@/actions/comps");
      const comp = await createComp({ name: "User A Comp" });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      const [bBuild] = await db
        .insert(builds)
        .values({ userId: "user-b", name: "User B Build", slug: "user-b-build-slug", content: "{}" })
        .returning();

      const { addBuildToComp } = await import("@/actions/comps");
      await expect(addBuildToComp({ compId: comp.id, buildId: bBuild.id })).rejects.toThrow("Comp not found");
    });

    it("user A cannot attach user B's private build to user A's own comp (cross-user build attach / ACM-016)", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      const [bBuild] = await db
        .insert(builds)
        .values({ userId: "user-b", name: "User B Private Build", slug: "user-b-private-slug", content: "{}" })
        .returning();

      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp, addBuildToComp } = await import("@/actions/comps");
      const comp = await createComp({ name: "User A Comp" });

      await expect(addBuildToComp({ compId: comp.id, buildId: bBuild.id })).rejects.toThrow("Build not found");
    });

    it("user A CAN attach user B's public build to user A's own comp", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      const [bBuild] = await db
        .insert(builds)
        .values({
          userId: "user-b",
          name: "User B Public Build",
          slug: "user-b-public-slug",
          content: "{}",
          isPublic: true,
        })
        .returning();

      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp, addBuildToComp } = await import("@/actions/comps");
      const comp = await createComp({ name: "User A Comp" });

      const row = await addBuildToComp({ compId: comp.id, buildId: bBuild.id });
      expect(row.buildId).toBe(bBuild.id);
      expect(row.compId).toBe(comp.id);
    });

    it("user B cannot remove a build from user A's comp", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const [aBuild] = await db
        .insert(builds)
        .values({ userId: "user-a", name: "User A Build", slug: "user-a-build-slug", content: "{}" })
        .returning();
      const { createComp, addBuildToComp, removeBuildFromComp } = await import("@/actions/comps");
      const comp = await createComp({ name: "User A Comp" });
      const compBuild = await addBuildToComp({ compId: comp.id, buildId: aBuild.id });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      await expect(removeBuildFromComp(comp.id, compBuild.id)).rejects.toThrow("Comp not found");
    });

    it("user B cannot edit label/count on user A's comp_builds row", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const [aBuild] = await db
        .insert(builds)
        .values({ userId: "user-a", name: "User A Build", slug: "user-a-build-slug-2", content: "{}" })
        .returning();
      const { createComp, addBuildToComp, updateCompBuild } = await import("@/actions/comps");
      const comp = await createComp({ name: "User A Comp" });
      const compBuild = await addBuildToComp({ compId: comp.id, buildId: aBuild.id });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      await expect(
        updateCompBuild({ compId: comp.id, compBuildId: compBuild.id, label: "Hijacked" }),
      ).rejects.toThrow("Comp not found");
    });

    it("user B cannot reorder user A's comp_builds", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const [aBuild] = await db
        .insert(builds)
        .values({ userId: "user-a", name: "User A Build", slug: "user-a-build-slug-3", content: "{}" })
        .returning();
      const { createComp, addBuildToComp, reorderCompBuilds } = await import("@/actions/comps");
      const comp = await createComp({ name: "User A Comp" });
      const compBuild = await addBuildToComp({ compId: comp.id, buildId: aBuild.id });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      await expect(reorderCompBuilds(comp.id, [compBuild.id])).rejects.toThrow("Comp not found");
    });
  });

  describe("count and label edits", () => {
    it("updates count and label independently", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const [aBuild] = await db
        .insert(builds)
        .values({ userId: "user-a", name: "User A Build", slug: "count-label-slug", content: "{}" })
        .returning();
      const { createComp, addBuildToComp, updateCompBuild } = await import("@/actions/comps");
      const comp = await createComp({ name: "User A Comp" });
      const compBuild = await addBuildToComp({ compId: comp.id, buildId: aBuild.id });
      expect(compBuild.count).toBe(1);
      expect(compBuild.label).toBeNull();

      const withLabel = await updateCompBuild({ compId: comp.id, compBuildId: compBuild.id, label: "Main Tank" });
      expect(withLabel.label).toBe("Main Tank");
      expect(withLabel.count).toBe(1);

      const withCount = await updateCompBuild({ compId: comp.id, compBuildId: compBuild.id, count: 5 });
      expect(withCount.count).toBe(5);
      expect(withCount.label).toBe("Main Tank");
    });
  });

  describe("reorderCompBuilds", () => {
    it("reorders builds within a comp and persists the final ordering", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const [b1, b2, b3] = await db
        .insert(builds)
        .values([
          { userId: "user-a", name: "Build 1", slug: "reorder-b1", content: "{}" },
          { userId: "user-a", name: "Build 2", slug: "reorder-b2", content: "{}" },
          { userId: "user-a", name: "Build 3", slug: "reorder-b3", content: "{}" },
        ])
        .returning();

      const { createComp, addBuildToComp, reorderCompBuilds, listCompBuilds } = await import("@/actions/comps");
      const comp = await createComp({ name: "Reorder Comp" });
      const cb1 = await addBuildToComp({ compId: comp.id, buildId: b1.id });
      const cb2 = await addBuildToComp({ compId: comp.id, buildId: b2.id });
      const cb3 = await addBuildToComp({ compId: comp.id, buildId: b3.id });

      expect([cb1.position, cb2.position, cb3.position]).toEqual([0, 1, 2]);

      // Swap the first and last: this is exactly the case that a naive
      // sequential per-row UPDATE fails on, since the unique
      // (comp_id, position) index cannot be deferred in SQLite.
      const reordered = await reorderCompBuilds(comp.id, [cb3.id, cb2.id, cb1.id]);

      expect(reordered.map((r) => r.id)).toEqual([cb3.id, cb2.id, cb1.id]);
      expect(reordered.map((r) => r.position)).toEqual([0, 1, 2]);

      // No duplicate or gapped positions after reorder.
      const positions = (await listCompBuilds(comp.id)).map((r) => r.position).sort((a, b) => a - b);
      expect(positions).toEqual([0, 1, 2]);
    });

    it("refuses a reorder that is not an exact permutation of the comp's rows", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const [b1, b2] = await db
        .insert(builds)
        .values([
          { userId: "user-a", name: "Build 1", slug: "bad-reorder-b1", content: "{}" },
          { userId: "user-a", name: "Build 2", slug: "bad-reorder-b2", content: "{}" },
        ])
        .returning();

      const { createComp, addBuildToComp, reorderCompBuilds } = await import("@/actions/comps");
      const comp = await createComp({ name: "Bad Reorder Comp" });
      const cb1 = await addBuildToComp({ compId: comp.id, buildId: b1.id });
      await addBuildToComp({ compId: comp.id, buildId: b2.id });

      // Missing one of the two existing rows.
      await expect(reorderCompBuilds(comp.id, [cb1.id])).rejects.toThrow(
        /orderedIds must be exactly the comp's existing comp_builds rows/,
      );

      // Foreign id that doesn't belong to this comp.
      await expect(reorderCompBuilds(comp.id, [cb1.id, "not-a-real-id"])).rejects.toThrow(
        /orderedIds must be exactly the comp's existing comp_builds rows/,
      );
    });
  });

  describe("deleteComp", () => {
    it("hard-deletes the comp and cascades its comp_builds rows", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const [aBuild] = await db
        .insert(builds)
        .values({ userId: "user-a", name: "User A Build", slug: "delete-comp-slug", content: "{}" })
        .returning();
      const { createComp, addBuildToComp, deleteComp, listMyComps, listCompBuilds } = await import("@/actions/comps");
      const comp = await createComp({ name: "Delete Me" });
      await addBuildToComp({ compId: comp.id, buildId: aBuild.id });

      await deleteComp(comp.id);

      expect(await listMyComps()).toHaveLength(0);
      await expect(listCompBuilds(comp.id)).rejects.toThrow("Comp not found");
    });
  });

  describe("rate limiting", () => {
    it("rejects the 31st write within a minute for the same user", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp } = await import("@/actions/comps");

      for (let i = 0; i < 30; i += 1) {
        await createComp({ name: `Comp ${i}` });
      }

      await expect(createComp({ name: "Comp 31" })).rejects.toThrow(/Too many requests/);
    });
  });
});
