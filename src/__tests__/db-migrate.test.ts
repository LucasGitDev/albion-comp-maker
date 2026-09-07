import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runMigrations } from "@/db/migrate";

describe("runMigrations", () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "acm-db-migrate-"));
    dbPath = path.join(tmpDir, "test.db");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates all 7 tables on an empty database", () => {
    runMigrations(dbPath);

    const sqlite = new Database(dbPath);
    try {
      const rows = sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'",
        )
        .all() as Array<{ name: string }>;
      const tableNames = rows.map((r) => r.name).sort();

      expect(tableNames).toEqual(
        [
          "account",
          "builds",
          "comp_builds",
          "comps",
          "session",
          "user",
          "verificationToken",
        ].sort(),
      );
    } finally {
      sqlite.close();
    }
  });
});
