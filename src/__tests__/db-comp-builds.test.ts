import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createConnection, createDb, type AppDatabase } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import { builds, compBuilds, comps, users } from "@/db/schema";

describe("comp_builds constraints (decision-001)", () => {
  let tmpDir: string;
  let dbPath: string;
  let db: AppDatabase;
  let sqlite: ReturnType<typeof createConnection>;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "acm-db-comp-builds-"));
    dbPath = path.join(tmpDir, "test.db");
    runMigrations(dbPath);
    sqlite = createConnection(dbPath);
    db = createDb(sqlite);

    await db.insert(users).values({ id: "user-1", name: "Test User" });
    await db.insert(comps).values({ id: "comp-1", userId: "user-1", name: "Test Comp" });
    await db.insert(builds).values([
      { id: "build-1", userId: "user-1", name: "Build 1", content: "{}" },
      { id: "build-2", userId: "user-1", name: "Build 2", content: "{}" },
    ]);
  });

  afterEach(() => {
    sqlite.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("allows the same (comp_id, build_id) pair at different positions", async () => {
    await db.insert(compBuilds).values({
      compId: "comp-1",
      buildId: "build-1",
      position: 0,
    });

    await expect(
      db.insert(compBuilds).values({
        compId: "comp-1",
        buildId: "build-1",
        position: 1,
      }),
    ).resolves.toBeDefined();
  });

  it("rejects two rows with the same (comp_id, position)", async () => {
    await db.insert(compBuilds).values({
      compId: "comp-1",
      buildId: "build-1",
      position: 0,
    });

    await expect(
      db.insert(compBuilds).values({
        compId: "comp-1",
        buildId: "build-2",
        position: 0,
      }),
    ).rejects.toThrow();
  });
});
