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

  describe("createCompAction (ACM-097)", () => {
    it("returns { ok: true, compId } for a valid name, mirroring createComp", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createCompAction } = await import("@/actions/comps");

      const result = await createCompAction({ name: "ZvZ Terça" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.compId).toBeTruthy();
      }
    });

    it("returns { ok: false } instead of throwing for an empty name (zod)", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createCompAction } = await import("@/actions/comps");

      const result = await createCompAction({ name: "   " });

      expect(result).toEqual({ ok: false, error: expect.any(String) });
    });

    it("returns { ok: false } instead of throwing when the write rate limit is exceeded", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createCompAction } = await import("@/actions/comps");
      const { checkWriteRateLimit } = await import("@/lib/rate-limit");

      // Exhaust the limiter directly rather than looping createCompAction
      // calls, so this test only depends on the limiter's own threshold,
      // not on how many comps createCompAction itself is allowed to make.
      for (let i = 0; i < 1000; i++) {
        try {
          checkWriteRateLimit("user-a");
        } catch {
          break;
        }
      }

      const result = await createCompAction({ name: "One Too Many" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/comps demais/);
      }
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

  describe("text size bounds (ACM-057)", () => {
    it("createComp rejects a name over the limit", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp } = await import("@/actions/comps");

      await expect(createComp({ name: "a".repeat(101) })).rejects.toThrow(/at most 100 characters/);
    });

    it("updateComp rejects a name over the limit", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp, updateComp } = await import("@/actions/comps");
      const comp = await createComp({ name: "Fine" });

      await expect(updateComp({ id: comp.id, name: "a".repeat(101) })).rejects.toThrow(/at most 100 characters/);
    });

    it("addBuildToComp rejects a label over the limit", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const [aBuild] = await db
        .insert(builds)
        .values({ userId: "user-a", name: "User A Build", slug: "bound-add-label-slug", content: "{}" })
        .returning();
      const { createComp, addBuildToComp } = await import("@/actions/comps");
      const comp = await createComp({ name: "Bound Comp" });

      await expect(
        addBuildToComp({ compId: comp.id, buildId: aBuild.id, label: "a".repeat(201) }),
      ).rejects.toThrow(/at most 200 characters/);
    });

    it("updateCompBuild rejects a label over the limit", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const [aBuild] = await db
        .insert(builds)
        .values({ userId: "user-a", name: "User A Build", slug: "bound-update-label-slug", content: "{}" })
        .returning();
      const { createComp, addBuildToComp, updateCompBuild } = await import("@/actions/comps");
      const comp = await createComp({ name: "Bound Comp 2" });
      const compBuild = await addBuildToComp({ compId: comp.id, buildId: aBuild.id });

      await expect(
        updateCompBuild({ compId: comp.id, compBuildId: compBuild.id, label: "a".repeat(201) }),
      ).rejects.toThrow(/at most 200 characters/);
    });

    it("createComp rejects an all-whitespace name", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp } = await import("@/actions/comps");

      await expect(createComp({ name: "   " })).rejects.toThrow(/Name is required/);
    });

    it("createComp trims surrounding whitespace before persisting", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp } = await import("@/actions/comps");

      const comp = await createComp({ name: "  Padded Name  " });
      expect(comp.name).toBe("Padded Name");
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

  describe("toggleCompPublic (ACM-066, decision-025)", () => {
    it("flips isPublic false -> true -> false", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp, toggleCompPublic } = await import("@/actions/comps");
      const comp = await createComp({ name: "Toggle Me" });
      expect(comp.isPublic).toBe(false);

      const flipped = await toggleCompPublic(comp.id);
      expect(flipped.isPublic).toBe(true);

      const flippedBack = await toggleCompPublic(comp.id);
      expect(flippedBack.isPublic).toBe(false);
    });

    it("a non-owner gets the same CompNotFoundError as a nonexistent id (IDOR)", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp, toggleCompPublic } = await import("@/actions/comps");
      const comp = await createComp({ name: "Owned By A" });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      await expect(toggleCompPublic(comp.id)).rejects.toThrow("Comp not found");
      await expect(toggleCompPublic("does-not-exist")).rejects.toThrow("Comp not found");
    });

    it("is rate-limited like any other write", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp, toggleCompPublic } = await import("@/actions/comps");
      const comp = await createComp({ name: "Rate Limited" });

      // createComp above already used 1 of the 30 writes allowed per minute.
      for (let i = 0; i < 29; i += 1) {
        await toggleCompPublic(comp.id);
      }

      await expect(toggleCompPublic(comp.id)).rejects.toThrow(/Too many requests/);
    });

    it("rejects without a session", async () => {
      mockRequireSession.mockRejectedValue(new Error("Unauthorized"));
      const { toggleCompPublic } = await import("@/actions/comps");

      await expect(toggleCompPublic("x")).rejects.toThrow("Unauthorized");
    });
  });

  describe("getCompPublishState (ACM-066, decision-025)", () => {
    it("classifies a build the caller owns but has not published as private-own", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const [ownBuild] = await db
        .insert(builds)
        .values({ userId: "user-a", name: "My Private Build", slug: "my-private-build", content: "{}" })
        .returning();

      const { createComp, addBuildToComp, toggleCompPublic, getCompPublishState } = await import("@/actions/comps");
      const comp = await createComp({ name: "Comp With Blockers" });
      await addBuildToComp({ compId: comp.id, buildId: ownBuild.id });
      await toggleCompPublic(comp.id);

      const state = await getCompPublishState(comp.id);

      expect(state.isPublic).toBe(true);
      expect(state.isReachable).toBe(false);
      expect(state.hasNoBuilds).toBe(false);
      expect(state.blockers).toHaveLength(1);
      expect(state.blockers[0]).toMatchObject({
        buildId: ownBuild.id,
        buildName: "My Private Build",
        reason: "private-own",
        ownedByMe: true,
      });
    });

    it("classifies another user's private build as private-foreign, unowned", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      const [foreignBuild] = await db
        .insert(builds)
        .values({ userId: "user-b", name: "Foreign Build", slug: "foreign-build", content: "{}", isPublic: true })
        .returning();

      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp, addBuildToComp, toggleCompPublic, getCompPublishState } = await import("@/actions/comps");
      const comp = await createComp({ name: "Comp With Foreign Build" });
      await addBuildToComp({ compId: comp.id, buildId: foreignBuild.id });
      await toggleCompPublic(comp.id);

      // The foreign build's owner later makes it private, breaking the
      // comp's link without user-a being able to do anything about it.
      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      const { toggleBuildPublic } = await import("@/actions/builds");
      await toggleBuildPublic(foreignBuild.id);

      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const state = await getCompPublishState(comp.id);

      expect(state.isReachable).toBe(false);
      expect(state.blockers).toHaveLength(1);
      expect(state.blockers[0]).toMatchObject({
        buildId: foreignBuild.id,
        reason: "private-foreign",
        ownedByMe: false,
      });
    });

    it("classifies a build with content that fails parseBuildContent as invalid-content", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const [invalidBuild] = await db
        .insert(builds)
        .values({
          userId: "user-a",
          name: "Invalid Content Build",
          slug: "invalid-content-build",
          content: "not valid json {{{",
          isPublic: true,
        })
        .returning();

      const { createComp, addBuildToComp, toggleCompPublic, getCompPublishState } = await import("@/actions/comps");
      const comp = await createComp({ name: "Comp With Invalid Build" });
      await addBuildToComp({ compId: comp.id, buildId: invalidBuild.id });
      await toggleCompPublic(comp.id);

      const state = await getCompPublishState(comp.id);

      expect(state.isReachable).toBe(false);
      expect(state.blockers).toHaveLength(1);
      expect(state.blockers[0]).toMatchObject({ buildId: invalidBuild.id, reason: "invalid-content" });
    });

    it("marks isReachable true once every build is public and valid and the comp itself is public", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const validContent = JSON.stringify({
        schemaVersion: 1,
        name: "Ready Build",
        role: "dps",
        accent: "#3f8f4a",
        slots: {
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
        },
        swaps: [],
      });
      const [publicBuild] = await db
        .insert(builds)
        .values({
          userId: "user-a",
          name: "Ready Build",
          slug: "ready-build",
          content: validContent,
          isPublic: true,
        })
        .returning();

      const { createComp, addBuildToComp, toggleCompPublic, getCompPublishState } = await import("@/actions/comps");
      const comp = await createComp({ name: "Ready Comp" });
      await addBuildToComp({ compId: comp.id, buildId: publicBuild.id });
      await toggleCompPublic(comp.id);

      const state = await getCompPublishState(comp.id);

      expect(state.isPublic).toBe(true);
      expect(state.hasNoBuilds).toBe(false);
      expect(state.blockers).toHaveLength(0);
      expect(state.isReachable).toBe(true);
    });

    it("a non-owner cannot read another user's comp publish state (IDOR)", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { createComp } = await import("@/actions/comps");
      const comp = await createComp({ name: "Owned By A" });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      const { getCompPublishState } = await import("@/actions/comps");
      await expect(getCompPublishState(comp.id)).rejects.toThrow("Comp not found");
    });

    it("rejects without a session", async () => {
      mockRequireSession.mockRejectedValue(new Error("Unauthorized"));
      const { getCompPublishState } = await import("@/actions/comps");

      await expect(getCompPublishState("x")).rejects.toThrow("Unauthorized");
    });
  });
});
