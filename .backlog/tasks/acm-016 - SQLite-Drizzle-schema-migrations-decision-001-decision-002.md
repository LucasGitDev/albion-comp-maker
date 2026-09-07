---
id: ACM-016
title: 'SQLite + Drizzle schema + migrations (decision-001, decision-002)'
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 16:35'
labels: []
milestone: m-5
dependencies:
  - ACM-015
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create Drizzle schema per PRD 5.2 with decisions applied: comp_builds uses surrogate PK, content_type is free text. WAL PRAGMAs on connection init. drizzle-kit migrations in drizzle/ dir.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All 7 tables created by drizzle-kit migrate on empty DB
- [ ] #2 WAL + busy_timeout + foreign_keys + synchronous=NORMAL set on connection
- [ ] #3 comp_builds has nanoid PK, (comp_id,build_id) non-unique index, (comp_id,position) unique index
- [ ] #4 DATABASE_PATH env var controls file location
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. [Research] Read decision-006 (schema), decision-001, decision-002. Confirm @auth/drizzle-adapter's generated schema shape for users/accounts/sessions/verification_tokens for the installed next-auth v5 version before hand-writing those table defs.
2. [Scaffold] Add drizzle-orm, better-sqlite3, drizzle-kit to package.json (flag for devex-guard - package.json touch). Create src/db/schema.ts defining all 7 tables per decision-006. Create src/db/client.ts opening the better-sqlite3 connection at DATABASE_PATH (default ./data/app.db) and running the 4 required PRAGMAs (journal_mode=WAL, foreign_keys=ON, busy_timeout=5000, synchronous=NORMAL) on every connection open.
3. [Scaffold] Add drizzle.config.ts pointing at src/db/schema.ts and drizzle/ output dir. Run `drizzle-kit generate` to produce the initial migration SQL into drizzle/.
4. [Implement] Add src/instrumentation.ts (or extend existing) to run drizzle-orm's migrate() against the drizzle/ folder on server startup, so an empty DB file self-migrates.
5. [Implement] comp_builds: nanoid PK column, non-unique index on (comp_id, build_id), unique index on (comp_id, position) - exactly as decision-001 specifies.
6. [Implement] builds.content and comps.content_type as free-form TEXT columns (no DB enum), matching decision-002's pattern. Do NOT add DB-level CHECK constraints on content_type.
7. [Test] Write a test that runs migrate() against a throwaway temp SQLite file and asserts all 7 tables exist (sqlite_master query) - covers AC#1. Write a test asserting the 4 PRAGMAs are set on a fresh connection (PRAGMA foreign_keys, journal_mode, etc. read back) - covers AC#2. Write a test inserting two comp_builds rows with same (comp_id, build_id) but different position (should succeed) and two rows with same (comp_id, position) (should reject) - covers AC#3.
8. [Test] Test that DATABASE_PATH env var, when set, controls the file location actually opened (point it at a temp dir, assert file created there) - covers AC#4.
9. [Verify] make check exits 0 on task branch.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Decision: decision-006 (SQLite + Drizzle schema for builds and comps) records entity defs, field types, relations, migration strategy. Risk: this task and ACM-017 both touch src/db/schema.ts and package.json - serialize, do not run concurrently (CLAUDE.md parallelism rule on shared package.json/schema files). Risk: @auth/drizzle-adapter's exact generated column set for accounts/sessions/verification_tokens must be checked against the installed next-auth version at implementation time, not assumed from decision doc prose.
<!-- SECTION:NOTES:END -->
