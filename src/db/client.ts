import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

/**
 * Resolves the SQLite file path from `DATABASE_PATH`, defaulting to
 * `./data/app.db`. The `data/` directory is gitignored and created lazily.
 */
export function resolveDatabasePath(): string {
  const configured = process.env.DATABASE_PATH ?? "./data/app.db";
  const resolved = path.resolve(process.cwd(), configured);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

/**
 * Opens a new better-sqlite3 connection at the given path (defaults to the
 * resolved `DATABASE_PATH`) and applies the required PRAGMAs. `foreign_keys`
 * is off by default per-connection in SQLite, so it must be set every time a
 * connection is opened, not just once at file creation.
 */
export function createConnection(databasePath: string = resolveDatabasePath()): Database.Database {
  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("synchronous = NORMAL");
  return sqlite;
}

export type AppDatabase = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Wraps a raw connection in a Drizzle instance bound to the app schema.
 */
export function createDb(sqlite: Database.Database = createConnection()): AppDatabase {
  return drizzle(sqlite, { schema });
}

let cachedDb: AppDatabase | undefined;

/**
 * Lazily-initialized singleton Drizzle instance for application code
 * (Server Actions, route handlers). Tests should use `createDb`/`createConnection`
 * directly against a throwaway file instead of this singleton.
 */
export function getDb(): AppDatabase {
  if (!cachedDb) {
    cachedDb = createDb();
  }
  return cachedDb;
}
