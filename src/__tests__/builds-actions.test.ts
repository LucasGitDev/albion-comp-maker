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

// `@/db/client`'s `getDb()` is a process-wide singleton pointed at
// `DATABASE_PATH`. Actions under test must run against a throwaway file
// instead, so replace `getDb` with one bound to the test's tmp database.
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

/** Minimal payload that satisfies `buildStateSchema`'s strict write path. */
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

describe("build Server Actions (ACM-018)", () => {
  let tmpDir: string;
  let dbPath: string;
  let db: AppDatabase;
  let sqlite: ReturnType<typeof createConnection>;

  beforeEach(async () => {
    __resetRateLimitState();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "acm-builds-actions-"));
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
    it("saveBuild rejects when there is no session, regardless of middleware", async () => {
      mockRequireSession.mockRejectedValueOnce(new Error("Unauthorized"));
      const { saveBuild } = await import("@/actions/builds");

      await expect(saveBuild({ name: "Fire Staff", content: validBuildContent() })).rejects.toThrow("Unauthorized");
    });

    it("updateBuild, deleteBuild, toggleBuildPublic, duplicateBuild, forkBuild, listMyBuilds all reject unauthenticated", async () => {
      mockRequireSession.mockRejectedValue(new Error("Unauthorized"));
      const actions = await import("@/actions/builds");

      await expect(actions.updateBuild({ id: "x" })).rejects.toThrow("Unauthorized");
      await expect(actions.deleteBuild("x")).rejects.toThrow("Unauthorized");
      await expect(actions.toggleBuildPublic("x")).rejects.toThrow("Unauthorized");
      await expect(actions.duplicateBuild("x")).rejects.toThrow("Unauthorized");
      await expect(actions.forkBuild("x")).rejects.toThrow("Unauthorized");
      await expect(actions.listMyBuilds()).rejects.toThrow("Unauthorized");
    });
  });

  describe("saveBuild", () => {
    it("creates a row with a nanoid id and an immutable slug derived from the name", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild } = await import("@/actions/builds");

      const build = await saveBuild({ name: "Fire Staff Carry", content: validBuildContent() });

      expect(build.id).toBeTruthy();
      expect(build.id.length).toBeGreaterThan(0);
      expect(build.slug.startsWith("fire-staff-carry-")).toBe(true);
      expect(build.userId).toBe("user-a");
    });
  });

  describe("theme_json write path (ACM-014, decision-019)", () => {
    function validTheme(overrides: Record<string, unknown> = {}): string {
      return JSON.stringify({
        preset: "dark-purple",
        aspectRatio: "auto",
        fontFamily: "sans",
        showItemNames: false,
        showSpellNames: true,
        background: null,
        ...overrides,
      });
    }

    it("saveBuild persists a valid theme with no background", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild } = await import("@/actions/builds");

      const build = await saveBuild({ name: "Themed", content: validBuildContent(), theme: validTheme() });
      expect(JSON.parse(build.themeJson!)).toMatchObject({ preset: "dark-purple" });
    });

    it("rejects a theme referencing a background image owned by a different user", async () => {
      const { backgroundImages } = await import("@/db/schema");
      await db.insert(backgroundImages).values({
        id: "img_owned_by_b_000000",
        userId: "user-b",
        fileName: "aaaaaaaaaaaaaaaaaaaaa.webp",
        width: 100,
        height: 100,
        bytes: 1000,
      });

      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild } = await import("@/actions/builds");

      await expect(
        saveBuild({
          name: "Themed",
          content: validBuildContent(),
          theme: validTheme({ background: { imageId: "img_owned_by_b_000000", blur: 0, darken: 0.4, scale: 1 } }),
        }),
      ).rejects.toThrow("does not belong to you");
    });

    it("accepts a theme referencing a background image owned by the caller", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { backgroundImages } = await import("@/db/schema");
      await db.insert(backgroundImages).values({
        id: "img_owned_by_a_000000",
        userId: "user-a",
        fileName: "bbbbbbbbbbbbbbbbbbbbb.webp",
        width: 100,
        height: 100,
        bytes: 1000,
      });

      const { saveBuild } = await import("@/actions/builds");
      const build = await saveBuild({
        name: "Themed",
        content: validBuildContent(),
        theme: validTheme({ background: { imageId: "img_owned_by_a_000000", blur: 5, darken: 0.5, scale: 1.2 } }),
      });

      expect(JSON.parse(build.themeJson!).background).toMatchObject({ imageId: "img_owned_by_a_000000" });
    });

    it("rejects a write-side theme with an unknown key (.strict())", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild } = await import("@/actions/builds");

      await expect(
        saveBuild({ name: "Themed", content: validBuildContent(), theme: validTheme({ accent: "#ff0000" }) }),
      ).rejects.toThrow();
    });

    it("updateBuild's theme validation also enforces background ownership", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild, updateBuild } = await import("@/actions/builds");
      const build = await saveBuild({ name: "Themed", content: validBuildContent() });

      const { backgroundImages } = await import("@/db/schema");
      await db.insert(backgroundImages).values({
        id: "img_owned_by_b_111111",
        userId: "user-b",
        fileName: "ccccccccccccccccccccc.webp",
        width: 100,
        height: 100,
        bytes: 1000,
      });

      await expect(
        updateBuild({
          id: build.id,
          theme: validTheme({ background: { imageId: "img_owned_by_b_111111", blur: 0, darken: 0.4, scale: 1 } }),
        }),
      ).rejects.toThrow("does not belong to you");
    });
  });

  describe("ownership scoping (IDOR)", () => {
    it("user B cannot read user A's build via listMyBuilds", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild, listMyBuilds } = await import("@/actions/builds");
      await saveBuild({ name: "Holy Healer", content: validBuildContent() });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      const bBuilds = await listMyBuilds();

      expect(bBuilds).toHaveLength(0);
    });

    it("user B cannot update user A's build", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild, updateBuild } = await import("@/actions/builds");
      const build = await saveBuild({ name: "Holy Healer", content: validBuildContent() });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      await expect(updateBuild({ id: build.id, name: "Hijacked" })).rejects.toThrow("Build not found");
    });

    it("user B cannot delete user A's build", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild, deleteBuild, listMyBuilds } = await import("@/actions/builds");
      const build = await saveBuild({ name: "Holy Healer", content: validBuildContent() });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      await expect(deleteBuild(build.id)).rejects.toThrow("Build not found");

      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const aBuilds = await listMyBuilds();
      expect(aBuilds).toHaveLength(1);
    });

    it("user B cannot toggle public on user A's build", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild, toggleBuildPublic } = await import("@/actions/builds");
      const build = await saveBuild({ name: "Holy Healer", content: validBuildContent() });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      await expect(toggleBuildPublic(build.id)).rejects.toThrow("Build not found");
    });

    it("user B cannot duplicate user A's private build", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild, duplicateBuild } = await import("@/actions/builds");
      const build = await saveBuild({ name: "Holy Healer", content: validBuildContent() });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      await expect(duplicateBuild(build.id)).rejects.toThrow("Build not found");
    });
  });

  describe("updateBuild", () => {
    it("validates session.user.id === owner_id and applies the update for the real owner", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild, updateBuild } = await import("@/actions/builds");
      const build = await saveBuild({ name: "Original", content: validBuildContent() });

      const updated = await updateBuild({ id: build.id, name: "Renamed" });

      expect(updated.name).toBe("Renamed");
      expect(updated.slug).toBe(build.slug); // slug stays immutable across edits
    });
  });

  describe("duplicateBuild", () => {
    it("copies content into a new row with a new id and slug", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild, duplicateBuild } = await import("@/actions/builds");
      const original = await saveBuild({ name: "Original", content: validBuildContent() });

      const copy = await duplicateBuild(original.id);

      expect(copy.id).not.toBe(original.id);
      expect(copy.slug).not.toBe(original.slug);
      expect(copy.content).toBe(original.content);
      expect(copy.userId).toBe("user-a");
    });

    it("refuses to duplicate a row whose content is legacy/invalid shape (ACM-049 AC#7)", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { duplicateBuild } = await import("@/actions/builds");
      const { BuildContentInvalidError } = await import("@/actions/build-errors");

      // Simulate a pre-ACM-049 row: written directly to the DB, bypassing
      // `validateBuildContentForWrite`, so it never went through the schema.
      const [legacy] = await db
        .insert(builds)
        .values({
          userId: "user-a",
          name: "Legacy",
          role: "dps",
          content: JSON.stringify({ someOldShape: true }),
          slug: "legacy-abc123",
        })
        .returning();

      await expect(duplicateBuild(legacy.id)).rejects.toThrow(BuildContentInvalidError);
    });

    it("ACM-031 review fix: duplicates a pre-ACM-031 row whose equipped item has no maxEnchant key, preserving its legacy enchant", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { duplicateBuild } = await import("@/actions/builds");

      const legacyContent = validBuildContent({
        slots: {
          mainhand: {
            itemId: "T4_HEAD_PLATE_SET1",
            tier: 4,
            enchant: 3,
            spells: { q: null, w: null, e: null, passive: null },
            twohanded: false,
          },
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
      });

      const [legacy] = await db
        .insert(builds)
        .values({
          userId: "user-a",
          name: "Legacy Enchanted",
          role: "dps",
          content: legacyContent,
          slug: "legacy-enchanted-abc123",
        })
        .returning();

      const copy = await duplicateBuild(legacy.id);

      expect(JSON.parse(copy.content).slots.mainhand).toMatchObject({
        enchant: 3,
        maxEnchant: 4,
      });
    });
  });

  describe("forkBuild", () => {
    it("copies a public build into the forking user's library and sets forkedFrom", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild, toggleBuildPublic, forkBuild } = await import("@/actions/builds");
      const original = await saveBuild({ name: "Public Build", content: validBuildContent() });
      await toggleBuildPublic(original.id);

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      const fork = await forkBuild(original.id);

      expect(fork.userId).toBe("user-b");
      expect(fork.forkedFrom).toBe(original.id);
      expect(fork.id).not.toBe(original.id);
    });

    it("refuses to fork a private build the caller does not own", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild, forkBuild } = await import("@/actions/builds");
      const original = await saveBuild({ name: "Private Build", content: validBuildContent() });

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      await expect(forkBuild(original.id)).rejects.toThrow("Build not found");
    });

    it("refuses to fork a public build with legacy/invalid content instead of laundering it (ACM-049 AC#7)", async () => {
      const { forkBuild } = await import("@/actions/builds");
      const { BuildContentInvalidError } = await import("@/actions/build-errors");

      // Another user's row, public, but written before ACM-049's schema
      // existed (or otherwise malformed) — the sharpest case per decision-013:
      // forking must not propagate unvalidated content across user boundaries.
      const [legacy] = await db
        .insert(builds)
        .values({
          userId: "user-a",
          name: "Legacy Public",
          role: "dps",
          content: "not even json",
          slug: "legacy-public-abc123",
          isPublic: true,
        })
        .returning();

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      await expect(forkBuild(legacy.id)).rejects.toThrow(BuildContentInvalidError);
    });

    it("ACM-031 review fix: forks a pre-ACM-031 public row whose equipped item has no maxEnchant key, preserving its legacy enchant", async () => {
      const legacyContent = validBuildContent({
        slots: {
          mainhand: {
            itemId: "T4_HEAD_PLATE_SET1",
            tier: 4,
            enchant: 2,
            spells: { q: null, w: null, e: null, passive: null },
            twohanded: false,
          },
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
      });

      const [legacy] = await db
        .insert(builds)
        .values({
          userId: "user-a",
          name: "Legacy Public Enchanted",
          role: "dps",
          content: legacyContent,
          slug: "legacy-public-enchanted-abc123",
          isPublic: true,
        })
        .returning();

      const { forkBuild } = await import("@/actions/builds");
      mockRequireSession.mockResolvedValue(sessionFor("user-b"));

      const fork = await forkBuild(legacy.id);

      expect(JSON.parse(fork.content).slots.mainhand).toMatchObject({
        enchant: 2,
        maxEnchant: 4,
      });
    });
  });

  describe("toggleBuildPublic", () => {
    it("flips is_public on each call", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild, toggleBuildPublic } = await import("@/actions/builds");
      const build = await saveBuild({ name: "Toggle Me", content: validBuildContent() });
      expect(build.isPublic).toBe(false);

      const toggledOn = await toggleBuildPublic(build.id);
      expect(toggledOn.isPublic).toBe(true);

      const toggledOff = await toggleBuildPublic(build.id);
      expect(toggledOff.isPublic).toBe(false);
    });
  });

  describe("deleteBuild", () => {
    it("hard-deletes the row for the owner", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild, deleteBuild, listMyBuilds } = await import("@/actions/builds");
      const build = await saveBuild({ name: "Delete Me", content: validBuildContent() });

      await deleteBuild(build.id);

      const remaining = await listMyBuilds();
      expect(remaining.find((b) => b.id === build.id)).toBeUndefined();
    });
  });

  describe("rate limiting", () => {
    it("rejects the 31st write within a minute for the same user", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild } = await import("@/actions/builds");

      for (let i = 0; i < 30; i += 1) {
        await saveBuild({ name: `Build ${i}`, content: validBuildContent() });
      }

      await expect(saveBuild({ name: "Build 31", content: validBuildContent() })).rejects.toThrow(/Too many requests/);
    });

    it("tracks limits per-user independently", async () => {
      mockRequireSession.mockResolvedValue(sessionFor("user-a"));
      const { saveBuild } = await import("@/actions/builds");
      for (let i = 0; i < 30; i += 1) {
        await saveBuild({ name: `Build ${i}`, content: validBuildContent() });
      }
      await expect(saveBuild({ name: "Build 31", content: validBuildContent() })).rejects.toThrow(/Too many requests/);

      mockRequireSession.mockResolvedValue(sessionFor("user-b"));
      await expect(saveBuild({ name: "User B Build", content: validBuildContent() })).resolves.toBeDefined();
    });
  });
});
