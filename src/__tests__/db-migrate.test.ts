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

  it("does not cascade-delete comp_builds rows when rebuilding the builds table", () => {
    // Regression test: migration 0001 rebuilds `builds` (DROP + rename) to
    // add the `slug`/`is_public`/`forked_from` columns. If that rebuild runs
    // under FK enforcement, SQLite treats the `DROP TABLE builds` as a real
    // delete and cascades into `comp_builds.build_id -> builds.id ON DELETE
    // CASCADE`, silently wiping comp_builds rows with no error. Seed a
    // comps row AND a comp_builds row referencing a pre-existing build, then
    // assert both the build and the comp_builds link survive migration 0001.
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
    seedSqlite.pragma("foreign_keys = ON");
    try {
      seedSqlite.prepare(`INSERT INTO user (id, name, email) VALUES (@id, @name, @email)`).run({
        id: "seed-user-2",
        name: "Seed User 2",
        email: "seed-user-2@example.com",
      });
      seedSqlite
        .prepare(
          `INSERT INTO builds (id, user_id, name, role, content)
           VALUES (@id, @userId, @name, @role, @content)`,
        )
        .run({
          id: "build-with-comp-link",
          userId: "seed-user-2",
          name: "Build With Comp Link",
          role: null,
          content: "{}",
        });
      seedSqlite
        .prepare(`INSERT INTO comps (id, user_id, name) VALUES (@id, @userId, @name)`)
        .run({ id: "comp-1", userId: "seed-user-2", name: "Comp 1" });
      seedSqlite
        .prepare(
          `INSERT INTO comp_builds (id, comp_id, build_id, position, count)
           VALUES (@id, @compId, @buildId, @position, @count)`,
        )
        .run({ id: "comp-build-1", compId: "comp-1", buildId: "build-with-comp-link", position: 0, count: 1 });
    } finally {
      seedSqlite.close();
    }

    runMigrations(dbPath, repoMigrationsDir);

    const sqlite = new Database(dbPath);
    try {
      const build = sqlite.prepare("SELECT id FROM builds WHERE id = ?").get("build-with-comp-link");
      expect(build).toBeTruthy();

      const compBuild = sqlite
        .prepare("SELECT id, comp_id, build_id FROM comp_builds WHERE id = ?")
        .get("comp-build-1") as { id: string; comp_id: string; build_id: string } | undefined;
      expect(compBuild).toBeTruthy();
      expect(compBuild?.build_id).toBe("build-with-comp-link");

      const compBuildsCount = sqlite.prepare("SELECT COUNT(*) as n FROM comp_builds").get() as { n: number };
      expect(compBuildsCount.n).toBe(1);
    } finally {
      sqlite.close();
    }
  });

  it("restores the pre-migration snapshot and throws when a rebuild migration leaves a foreign key violation", () => {
    // Simulate the exact failure mode this task fixes: a table-rebuild
    // migration (0001) that manages to leave a dangling foreign key behind
    // (e.g. a bug in a future rebuild migration's backfill/copy step).
    // `runMigrations` must not silently commit that state — it must restore
    // the file to what it was before this run and throw, refusing to boot
    // against a half-migrated database.
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
      entries: Array<{ when: number; tag: string }>;
    };
    fs.writeFileSync(
      path.join(phase1Dir, "meta", "_journal.json"),
      JSON.stringify({ ...journal, entries: journal.entries.slice(0, 1) }),
    );

    runMigrations(dbPath, phase1Dir);

    // Seed a comps/comp_builds row referencing a build, exactly like the
    // cascade-delete regression test above.
    const seedSqlite = new Database(dbPath);
    seedSqlite.pragma("foreign_keys = ON");
    try {
      seedSqlite.prepare(`INSERT INTO user (id, name, email) VALUES (@id, @name, @email)`).run({
        id: "seed-user-3",
        name: "Seed User 3",
        email: "seed-user-3@example.com",
      });
      seedSqlite
        .prepare(
          `INSERT INTO builds (id, user_id, name, role, content)
           VALUES (@id, @userId, @name, @role, @content)`,
        )
        .run({
          id: "build-to-survive",
          userId: "seed-user-3",
          name: "Build To Survive",
          role: null,
          content: "{}",
        });
      seedSqlite
        .prepare(`INSERT INTO comps (id, user_id, name) VALUES (@id, @userId, @name)`)
        .run({ id: "comp-2", userId: "seed-user-3", name: "Comp 2" });
      seedSqlite
        .prepare(
          `INSERT INTO comp_builds (id, comp_id, build_id, position, count)
           VALUES (@id, @compId, @buildId, @position, @count)`,
        )
        .run({ id: "comp-build-2", compId: "comp-2", buildId: "build-to-survive", position: 0, count: 1 });
    } finally {
      seedSqlite.close();
    }

    const preMigrationSnapshot = fs.readFileSync(dbPath);

    // Build a broken variant of migration 0001 that rebuilds `builds` but
    // (unlike the real migration) does NOT copy the pre-existing row into
    // the new table, so `comp_builds.build_id` is left dangling once FK
    // enforcement is switched back on.
    const brokenDir = path.join(tmpDir, "migrations-broken");
    fs.mkdirSync(path.join(brokenDir, "meta"), { recursive: true });
    fs.copyFileSync(path.join(phase1Dir, "0000_overconfident_the_fury.sql"), path.join(brokenDir, "0000_overconfident_the_fury.sql"));
    fs.copyFileSync(path.join(phase1Dir, "meta", "0000_snapshot.json"), path.join(brokenDir, "meta", "0000_snapshot.json"));

    const realMigration1 = fs.readFileSync(path.join(repoMigrationsDir, "0001_add_build_slug_public_forked.sql"), "utf-8");
    const brokenMigration1 = realMigration1.replace(
      "INSERT INTO `__new_builds` (`id`, `user_id`, `name`, `role`, `content`, `slug`, `is_public`, `forked_from`, `created_at`, `updated_at`)\nSELECT `id`, `user_id`, `name`, `role`, `content`, `id`, false, NULL, `created_at`, `updated_at` FROM `builds`;",
      "-- (intentionally broken for the test: no INSERT here, so pre-existing rows are lost on DROP TABLE)\nSELECT 1;",
    );
    expect(brokenMigration1).not.toEqual(realMigration1); // guard against the replace() silently no-op'ing
    fs.writeFileSync(path.join(brokenDir, "0001_add_build_slug_public_forked.sql"), brokenMigration1);

    fs.writeFileSync(
      path.join(brokenDir, "meta", "_journal.json"),
      JSON.stringify({ ...journal, entries: journal.entries.slice(0, 2) }),
    );

    expect(() => runMigrations(dbPath, brokenDir)).toThrow(/foreign key violation/i);

    const restoredContents = fs.readFileSync(dbPath);
    expect(restoredContents.equals(preMigrationSnapshot)).toBe(true);

    const restoredSqlite = new Database(dbPath);
    try {
      const compBuild = restoredSqlite.prepare("SELECT id FROM comp_builds WHERE id = ?").get("comp-build-2");
      expect(compBuild).toBeTruthy();
      const build = restoredSqlite.prepare("SELECT id FROM builds WHERE id = ?").get("build-to-survive");
      expect(build).toBeTruthy();
    } finally {
      restoredSqlite.close();
    }

    // The backup is deliberately left in place (not deleted) on failure, so
    // an operator can inspect the pre-migration state independently of the
    // now-restored main db file.
    expect(fs.existsSync(`${dbPath}.pre-migration-backup`)).toBe(true);
  });

  it("leaves FK enforcement on for a plain (non-rebuild) migration once rebuild migrations are already applied", () => {
    // Once 0001/0002 have been applied, a future ADD COLUMN-style migration
    // should run with FK enforcement ON the whole time (scoped FK-off, see
    // decision-014) — SQLite/drizzle's own transaction rollback is then the
    // safety net, not the backup/restore dance.
    runMigrations(dbPath);

    const plainDir = path.join(tmpDir, "migrations-plain");
    fs.cpSync(path.resolve(process.cwd(), "drizzle"), plainDir, { recursive: true });
    const journalPath = path.join(plainDir, "meta", "_journal.json");
    const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8")) as {
      entries: Array<{ when: number; tag: string; idx: number; version: string; breakpoints: boolean }>;
    };
    const nextTag = "0003_add_plain_column";
    fs.writeFileSync(path.join(plainDir, `${nextTag}.sql`), "ALTER TABLE `comps` ADD `notes` text;");
    journal.entries.push({
      idx: journal.entries.length,
      version: journal.entries[0].version,
      when: Date.now(),
      tag: nextTag,
      breakpoints: true,
    });
    fs.writeFileSync(journalPath, JSON.stringify(journal));

    // The plain migration applies cleanly and does not leave a
    // pre-migration-backup file around (the scoping check determined FK-off
    // was unnecessary, so no snapshot is taken).
    expect(() => runMigrations(dbPath, plainDir)).not.toThrow();
    expect(fs.existsSync(`${dbPath}.pre-migration-backup`)).toBe(false);

    const sqlite = new Database(dbPath);
    try {
      const columns = sqlite.pragma("table_info(comps)") as Array<{ name: string }>;
      expect(columns.some((c) => c.name === "notes")).toBe(true);
    } finally {
      sqlite.close();
    }
  });

  it("creates all 8 tables on an empty database", () => {
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
          "background_images",
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

  it("migration 0003 adds builds.theme_json and creates background_images with the expected shape", () => {
    runMigrations(dbPath);

    const sqlite = new Database(dbPath);
    try {
      const buildColumns = sqlite.pragma("table_info(builds)") as Array<{
        name: string;
        notnull: number;
      }>;
      const themeJson = buildColumns.find((c) => c.name === "theme_json");
      expect(themeJson).toBeDefined();
      expect(themeJson?.notnull).toBe(0); // nullable

      const bgColumns = sqlite.pragma("table_info(background_images)") as Array<{
        name: string;
        notnull: number;
        pk: number;
      }>;
      const byName = Object.fromEntries(bgColumns.map((c) => [c.name, c]));
      expect(byName.id?.pk).toBe(1);
      expect(byName.user_id?.notnull).toBe(1);
      expect(byName.file_name?.notnull).toBe(1);
      expect(byName.width?.notnull).toBe(1);
      expect(byName.height?.notnull).toBe(1);
      expect(byName.bytes?.notnull).toBe(1);
      expect(byName.created_at?.notnull).toBe(1);

      const indexes = sqlite.pragma("index_list(background_images)") as Array<{ name: string }>;
      expect(indexes.some((i) => i.name === "background_images_user_id_idx")).toBe(true);

      // decision-018: user_id FK cascades. No pending "DROP TABLE" statement
      // in this migration, so foreign_key_check runs enforced throughout —
      // asserting zero violations here doubles as the FK-integrity guard
      // this migration needed (decision-014).
      const violations = sqlite.pragma("foreign_key_check") as unknown[];
      expect(violations).toEqual([]);
    } finally {
      sqlite.close();
    }
  });
});
