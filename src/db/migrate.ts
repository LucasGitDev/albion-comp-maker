import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type Database from "better-sqlite3";

import { createConnection, createDb, resolveDatabasePath } from "./client";

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");

// Same table name/shape drizzle's own migrator creates internally (see
// `SQLiteSyncDialect.migrate` in `drizzle-orm/sqlite-core/dialect.js`). We
// need to read it ourselves, before drizzle's `migrate()` runs, to work out
// which migrations are still pending.
const DRIZZLE_MIGRATIONS_TABLE = "__drizzle_migrations";

interface JournalEntry {
  tag: string;
  when: number;
}

/**
 * A SQLite `DROP TABLE` is a real delete under `PRAGMA foreign_keys = ON`
 * and cascades into any child rows referencing the dropped table (see the
 * `migrate.ts` history / decision-014 for the incident this guards against).
 * Drizzle's SQLite table-rebuild migrations (change a column's
 * nullability/type, add a `NOT NULL` column, etc.) always follow the
 * `CREATE __new_x` -> copy -> `DROP TABLE x` -> `RENAME` pattern, so
 * detecting a pending `DROP TABLE` statement is a reliable proxy for "this
 * migration run needs FK enforcement suspended".
 */
const REBUILD_MIGRATION_PATTERN = /drop\s+table/i;

/**
 * Inspects the migration journal against the already-applied rows in
 * `__drizzle_migrations` (creating that table if it doesn't exist yet,
 * mirroring what drizzle's own migrator does) and returns whether any
 * *pending* (not yet applied) migration file rebuilds a table. Only in that
 * case do we need to run this migration batch with FK enforcement off.
 */
function pendingMigrationsNeedFkOff(sqlite: Database.Database, migrationsFolder: string): boolean {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) {
    return false;
  }
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8")) as { entries: JournalEntry[] };

  sqlite.exec(
    `CREATE TABLE IF NOT EXISTS ${DRIZZLE_MIGRATIONS_TABLE} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`,
  );
  const lastApplied = sqlite
    .prepare(`SELECT created_at FROM ${DRIZZLE_MIGRATIONS_TABLE} ORDER BY created_at DESC LIMIT 1`)
    .get() as { created_at: number } | undefined;

  return journal.entries.some((entry) => {
    if (lastApplied !== undefined && entry.when <= lastApplied.created_at) {
      return false; // already applied in a previous run
    }
    const sqlFile = path.join(migrationsFolder, `${entry.tag}.sql`);
    if (!fs.existsSync(sqlFile)) {
      return false;
    }
    return REBUILD_MIGRATION_PATTERN.test(fs.readFileSync(sqlFile, "utf-8"));
  });
}

/**
 * Next.js can boot multiple worker processes, each calling `runMigrations()`
 * independently (see `src/instrumentation.ts`). A fixed backup path would let
 * two workers racing a FK-off migration overwrite each other's snapshot —
 * e.g. worker A's backup gets clobbered by worker B's `copyFileSync`, then
 * worker A restores worker B's (unrelated) snapshot. Suffixing with the PID
 * and a random UUID makes every run's backup path unique, so concurrent runs
 * never share a file to race over (ACM-061).
 */
function backupFilePath(databasePath: string): string {
  return `${databasePath}.pre-migration-backup.${process.pid}.${crypto.randomUUID()}`;
}

/**
 * Snapshots the database file before a FK-off migration run, so a detected
 * `foreign_key_check` violation (see below) has something to restore from.
 * Checkpoints WAL into the main file first so the copy is a complete,
 * self-contained snapshot.
 */
function createPreMigrationBackup(sqlite: Database.Database, databasePath: string): string {
  sqlite.pragma("wal_checkpoint(TRUNCATE)");
  const backup = backupFilePath(databasePath);
  fs.copyFileSync(databasePath, backup);
  return backup;
}

function restorePreMigrationBackup(databasePath: string, backup: string): void {
  fs.copyFileSync(backup, databasePath);
  // Drop any WAL/SHM files left behind by the failed migration attempt so
  // the restored main file is what gets loaded on the next connection.
  for (const suffix of ["-wal", "-shm"]) {
    const sidecar = `${databasePath}${suffix}`;
    if (fs.existsSync(sidecar)) {
      fs.rmSync(sidecar);
    }
  }
}

/**
 * Applies all pending migrations from `drizzle/` (or `migrationsFolder`, for
 * tests that need to apply a subset of migrations against a seeded
 * database) to the database at `databasePath` (defaults to the resolved
 * `DATABASE_PATH`). Safe to call against an empty/non-existent file — the
 * file and its schema are created from scratch.
 *
 * FK enforcement is suspended for this run ONLY if a pending migration does
 * a table rebuild (see `pendingMigrationsNeedFkOff`) — see decision-014 for
 * why this is scoped rather than global, and for the recovery strategy
 * (pre-migration backup + restore-and-throw) implemented below for the case
 * where a rebuild leaves dangling foreign keys.
 */
export function runMigrations(databasePath?: string, migrationsFolder: string = MIGRATIONS_FOLDER): void {
  const resolvedPath = databasePath ?? resolveDatabasePath();
  const sqlite = createConnection(resolvedPath);
  try {
    const needsFkOff = pendingMigrationsNeedFkOff(sqlite, migrationsFolder);

    let backup: string | undefined;
    if (needsFkOff) {
      backup = createPreMigrationBackup(sqlite, resolvedPath);
      sqlite.pragma("foreign_keys = OFF");
    }

    const db = createDb(sqlite);
    migrate(db, { migrationsFolder });

    if (!needsFkOff) {
      // FK enforcement was never suspended, so SQLite itself would have
      // rejected any violating statement mid-transaction and drizzle's
      // migrator (`SQLiteSyncDialect.migrate`) would have rolled the whole
      // batch back automatically. Nothing left to verify.
      return;
    }

    sqlite.pragma("foreign_keys = ON");
    const violations = sqlite.pragma("foreign_key_check") as unknown[];
    if (violations.length === 0) {
      // Clean run: the backup is no longer needed.
      fs.rmSync(backup as string, { force: true });
      return;
    }

    // The migration transaction already committed by the time we get here
    // (drizzle's SQLite migrator runs a raw BEGIN/COMMIT internally and
    // `PRAGMA foreign_key_check` can only observe the result afterwards —
    // see decision-014 for the evidence). We cannot roll back the
    // transaction itself, so instead we restore the file-level snapshot
    // taken before this run and fail loudly: the app must not boot against
    // a half-migrated database.
    sqlite.close();
    restorePreMigrationBackup(resolvedPath, backup as string);
    throw new Error(
      `Migration left ${violations.length} foreign key violation(s) and has been rolled back: ` +
        `the database at ${resolvedPath} was restored from the pre-migration snapshot. ` +
        `The migration itself was NOT applied — fix it and retry. Violations: ${JSON.stringify(violations)}`,
    );
  } finally {
    if (sqlite.open) {
      sqlite.close();
    }
  }
}
