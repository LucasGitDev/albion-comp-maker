---
id: decision-014
title: >-
  Migration foreign_key_check runs post-commit: scoped FK-off,
  backup-and-restore recovery
date: '2026-09-07 19:59'
status: accepted
---
## Context

ACM-018 found that `src/db/migrate.ts`'s table-rebuild migrations (0001,
0002 — both `DROP TABLE` + rename to change column shape) run under
`PRAGMA foreign_keys = ON`, and SQLite treats a `DROP TABLE` as a real
delete: it cascades into any child rows referencing the dropped table
(`comp_builds.build_id -> builds.id ON DELETE CASCADE`,
`comp_builds.comp_id -> comps.id ON DELETE CASCADE`), silently destroying
data. The ACM-018 fix toggled `PRAGMA foreign_keys = OFF` around the whole
migration run and added a `PRAGMA foreign_key_check` afterwards, throwing
on any violation. That fix was correct and necessary. The final review of
that PR (#28) carried forward two residual problems as ACM-050:

1. **The check runs after the transaction already committed.**
   `drizzle-orm`'s SQLite migrator (`SQLiteSyncDialect.migrate`, see
   `node_modules/drizzle-orm/sqlite-core/dialect.js`) issues its own raw
   `BEGIN` / loop-of-statements / `COMMIT` internally — it is not exposed as
   a callback we can hook into, and better-sqlite3 has no nested
   transactions (only savepoints, which drizzle also doesn't expose here).
   By the time `runMigrations` gets to call `PRAGMA foreign_key_check`, the
   migration has already been committed to disk. A violation at that point
   is a loud alarm, not an automatic rollback — the previous implementation
   left the app to simply throw and leave the database half-migrated, with
   no defined recovery path.
2. **FK enforcement was disabled for every migration, forever**, not just
   the ones that actually need it (0001 and 0002, which rebuild a table).
   Any future migration — even a plain `ADD COLUMN`, which is always safe
   under FK enforcement — would silently run with FKs off too, and nothing
   in the code told a future migration author this was happening or why.

## Decision

**Scoping (residual problem 2).** Before calling drizzle's `migrate()`,
`runMigrations` now reads the migration journal
(`drizzle/meta/_journal.json`) and the app's own `__drizzle_migrations`
table (same shape drizzle creates internally) to work out which migrations
are still *pending* for this run, then greps each pending migration's SQL
file for `DROP TABLE`. FK enforcement is suspended for a run **only if** a
pending migration matches — i.e. only while 0001/0002 (or any future
rebuild-style migration) haven't been applied yet on a given database. Once
a database has 0001/0002 applied, all subsequent `runMigrations` calls
(including every future plain migration) run with FK enforcement ON the
whole time. This is a proxy, not a parser: it assumes any migration file
containing `DROP TABLE` is doing a rebuild-of-a-referenced-table, which
holds for every migration this repo's drizzle-kit generator has produced so
far ("CREATE __new_x" -> copy -> "DROP TABLE x" -> "RENAME"). A future
migration author who needs to drop a table that is genuinely no longer
referenced by anything doesn't need to do anything differently — FK-off
being applied when strictly unnecessary is safe, just slightly more
cautious than required. A future migration author who introduces a NEW
table-rebuild migration gets FK-off applied automatically for that one run
because it, too, will contain `DROP TABLE` while still pending — no manual
opt-in required.

**Recovery (residual problem 1).** We evaluated moving the
`foreign_key_check` inside the migration transaction so a violation could
trigger a true `ROLLBACK`. This is not possible without reimplementing
drizzle's `SQLiteSyncDialect.migrate` ourselves (undocumented, non-exported
module path `drizzle-orm/migrator.js`, tightly coupled to drizzle's
internal migrations-table bookkeeping) — evidence:
`node_modules/drizzle-orm/sqlite-core/dialect.js` shows `migrate()` opens
`BEGIN`, loops the pending migration files, and issues `COMMIT` (or
`ROLLBACK` + rethrow on error) all inside one method call, with no hook
point exposed between "last statement executed" and "COMMIT issued". Doing
that ourselves would mean depending on `readMigrationFiles`, a function
that is not part of the public `drizzle-orm/better-sqlite3` or
`drizzle-orm/migrator` export map, for behavior mirroring an internal
implementation detail that could change between drizzle-orm versions
without a major bump.

Instead: whenever FK enforcement is going to be suspended for a run (see
scoping above), `runMigrations` takes a file-level snapshot of the database
(`PRAGMA wal_checkpoint(TRUNCATE)` then `fs.copyFileSync` to
`<db-path>.pre-migration-backup`) before calling `migrate()`. If
`foreign_key_check` finds violations afterwards, `runMigrations`:

1. closes the (already-committed, now-known-bad) connection,
2. restores the database file from the pre-migration snapshot (removing any
   `-wal`/`-shm` sidecars left behind so the restored file is loaded
   cleanly on the next connection),
3. throws a descriptive error naming the snapshot path and stating the
   migration was **not** applied.

This is an explicit, loud, actionable failure — the process that calls
`runMigrations()` (see `src/instrumentation.ts`, which calls it
unconditionally on Node.js boot) does not catch this error, so the app
process fails to start rather than silently serving traffic against a
half-migrated database. This satisfies the ACM-018 lesson (silent success
is the worst outcome) while giving the operator a working, unmigrated
database file back rather than a half-migrated one, and a clear next step
("fix the migration and retry").

On a clean run, the snapshot is deleted (`fs.rmSync`) once
`foreign_key_check` reports zero violations, so no backup files accumulate
across normal deploys.

## Consequences

- Migration authors: a plain `ADD COLUMN` / `CREATE TABLE` / `CREATE INDEX`
  migration runs with FK enforcement ON and gets automatic
  transaction-level rollback from drizzle/SQLite itself on any violation —
  no special handling needed. A migration that needs to rebuild
  (DROP + rename) a table that other tables reference via foreign keys will
  automatically get FK-off + backup/restore for that one run; no opt-in
  required, but authors should know this is why their rebuild migration
  doesn't fail loudly mid-run the way a normal one would.
- The backup/restore path only ever engages for FK-off runs, so a fresh
  install (all migrations pending, including 0001/0002) will always take
  and then discard one snapshot. This is a few extra file I/O calls at boot
  time, once, and is judged an acceptable cost for the safety it buys.
- If `runMigrations` itself throws for a reason unrelated to
  `foreign_key_check` (e.g. a syntax error in a new migration file),
  drizzle's own `SQLiteSyncDialect.migrate` already issued a `ROLLBACK` on
  that transaction — no snapshot restore is needed or attempted in that
  path, since the failure happened before we ever suspend FK enforcement
  for a plain migration, or the transaction rollback already left the
  pre-rebuild data intact for a suspended one.
- This does not achieve true atomicity (a single all-or-nothing transaction
  covering the rebuild + verification). It achieves an equivalent outcome
  by other means: on failure the database ends up byte-for-byte identical
  to its pre-migration state, and the process refuses to boot in the
  interim. If drizzle-orm ever exposes a hook between the last migration
  statement and `COMMIT` (or a lower-level transaction API for its SQLite
  migrator), switching to a true in-transaction check + rollback should be
  preferred over this file-snapshot approach.
