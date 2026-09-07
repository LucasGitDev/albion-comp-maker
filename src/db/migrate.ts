import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createConnection, createDb } from "./client";

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");

/**
 * Applies all pending migrations from `drizzle/` (or `migrationsFolder`, for
 * tests that need to apply a subset of migrations against a seeded
 * database) to the database at `databasePath` (defaults to the resolved
 * `DATABASE_PATH`). Safe to call against an empty/non-existent file — the
 * file and its schema are created from scratch.
 */
export function runMigrations(databasePath?: string, migrationsFolder: string = MIGRATIONS_FOLDER): void {
  const sqlite = createConnection(databasePath);
  try {
    // SQLite table-rebuild migrations (e.g. 0001_add_build_slug_public_forked.sql)
    // DROP + rename the target table to change its shape. `createConnection`
    // sets `PRAGMA foreign_keys = ON`, and under FK enforcement a `DROP TABLE`
    // is a real delete that cascades into any child rows referencing it
    // (e.g. `comp_builds.build_id -> builds.id ON DELETE CASCADE`), silently
    // destroying data before the rename puts the "new" table back in place.
    //
    // `PRAGMA foreign_keys` is also a no-op inside a transaction in SQLite,
    // and drizzle's migrator runs all pending migrations inside one, so the
    // pragma MUST be toggled here, on the raw connection, before `migrate()`
    // opens its transaction — flipping it inside a migration file would not
    // take effect.
    sqlite.pragma("foreign_keys = OFF");
    const db = createDb(sqlite);
    migrate(db, { migrationsFolder });

    // Re-enable enforcement and verify the migration didn't leave any
    // dangling references (which running with FKs off could otherwise mask).
    sqlite.pragma("foreign_keys = ON");
    const violations = sqlite.pragma("foreign_key_check") as unknown[];
    if (violations.length > 0) {
      throw new Error(
        `Migration left ${violations.length} foreign key violation(s): ${JSON.stringify(violations)}`,
      );
    }
  } finally {
    sqlite.close();
  }
}
