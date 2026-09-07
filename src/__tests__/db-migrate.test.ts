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

  it("backfills a valid, unique, non-null slug for builds inserted before the slug migration ran", () => {
    // Simulate an environment where `builds` already has rows before
    // migration 0001 (add slug/is_public/forked_from) runs: apply only
    // migration 0000, seed a row using the pre-slug shape, then apply the
    // rest of the migrations and assert the row was backfilled correctly.
    const repoMigrationsDir = path.resolve(process.cwd(), "drizzle");
    const phase1Dir = path.join(tmpDir, "migrations-phase1");
    fs.mkdirSync(path.join(phase1Dir, "meta"), { recursive: true });

    for (const file of ["0000_overconfident_the_fury.sql"]) {
      fs.copyFileSync(path.join(repoMigrationsDir, file), path.join(phase1Dir, file));
    }
    for (const file of ["0000_snapshot.json"]) {
      fs.copyFileSync(path.join(repoMigrationsDir, "meta", file), path.join(phase1Dir, "meta", file));
    }
    const journal = JSON.parse(fs.readFileSync(path.join(repoMigrationsDir, "meta", "_journal.json"), "utf-8")) as {
      entries: unknown[];
    };
    fs.writeFileSync(
      path.join(phase1Dir, "meta", "_journal.json"),
      JSON.stringify({ ...journal, entries: journal.entries.slice(0, 1) }),
    );

    runMigrations(dbPath, phase1Dir);

    const seedSqlite = new Database(dbPath);
    try {
      seedSqlite.prepare(`INSERT INTO user (id, name, email) VALUES (@id, @name, @email)`).run({
        id: "seed-user",
        name: "Seed User",
        email: "seed-user@example.com",
      });
      seedSqlite
        .prepare(
          `INSERT INTO builds (id, user_id, name, role, content)
           VALUES (@id, @userId, @name, @role, @content)`,
        )
        .run({
          id: "pre-existing-build-id",
          userId: "seed-user",
          name: "Pre-existing Build",
          role: null,
          content: "{}",
        });
    } finally {
      seedSqlite.close();
    }

    runMigrations(dbPath, repoMigrationsDir);

    const sqlite = new Database(dbPath);
    try {
      const row = sqlite
        .prepare("SELECT id, slug, is_public, forked_from FROM builds WHERE id = ?")
        .get("pre-existing-build-id") as {
        id: string;
        slug: string | null;
        is_public: number;
        forked_from: string | null;
      };

      expect(row.slug).toBeTruthy();
      expect(row.slug).not.toBeNull();
      expect(row.is_public).toBe(0);
      expect(row.forked_from).toBeNull();

      const distinctSlugs = sqlite.prepare("SELECT COUNT(DISTINCT slug) as n FROM builds").get() as { n: number };
      const totalRows = sqlite.prepare("SELECT COUNT(*) as n FROM builds").get() as { n: number };
      expect(distinctSlugs.n).toBe(totalRows.n);
    } finally {
      sqlite.close();
    }
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
