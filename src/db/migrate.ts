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
    const db = createDb(sqlite);
    migrate(db, { migrationsFolder });
  } finally {
    sqlite.close();
  }
}
