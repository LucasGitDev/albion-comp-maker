---
id: ACM-016
title: 'SQLite + Drizzle schema + migrations (decision-001, decision-002)'
status: Done
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 17:06'
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
- [x] #1 All 7 tables created by drizzle-kit migrate on empty DB
- [x] #2 WAL + busy_timeout + foreign_keys + synchronous=NORMAL set on connection
- [x] #3 comp_builds has nanoid PK, (comp_id,build_id) non-unique index, (comp_id,position) unique index
- [x] #4 DATABASE_PATH env var controls file location
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

Schema (src/db/schema.ts, 7 tables total):
- Auth.js v5 Drizzle adapter tables, hand-written to match @auth/drizzle-adapter's sqlite factory output exactly (table names user/account/session/verificationToken, column names/types, composite PKs on account(provider,providerAccountId) and verificationToken(identifier,token)). Not generated from the adapter package itself since it is not installed yet (ACM-017's job) -- verified the expected shape against the documented adapter schema referenced in decision-006.
- builds: id (nanoid PK), user_id FK->users, name, role (free text), content (JSON TEXT, app-validated, no DB interpretation), created_at/updated_at (unixepoch ms default).
- comps: id (nanoid PK), user_id FK->users, name, content_type (free TEXT, no enum/CHECK per decision-002), created_at/updated_at.
- comp_builds: surrogate nanoid PK per decision-001, comp_id/build_id FKs (ON DELETE CASCADE), position (0-based ordering, required by ACM-019), count (default 1). Non-unique index on (comp_id, build_id); unique index on (comp_id, position).

Connection (src/db/client.ts): createConnection() opens better-sqlite3 and sets journal_mode=WAL, foreign_keys=ON, busy_timeout=5000, synchronous=NORMAL on every open (foreign_keys is per-connection in SQLite). resolveDatabasePath() reads DATABASE_PATH env var, defaults to ./data/app.db, creates parent dir. createDb()/getDb() wrap a connection in a Drizzle instance typed against the schema.

Migrations (drizzle/0000_overconfident_the_fury.sql, generated via `pnpm exec drizzle-kit generate`): committed, creates all 7 tables + the two comp_builds indexes from scratch. src/db/migrate.ts exports runMigrations(databasePath?) using drizzle-orm/better-sqlite3/migrator against the drizzle/ folder -- verified in db-migrate.test.ts against a throwaway temp file (AC#1).

Deviation from the task's plan: did NOT add src/instrumentation.ts to auto-run migrations on Next.js server startup. The task prompt's strict file-scope list (src/db/**, drizzle.config.ts, package.json, .env.example/.gitignore, src/__tests__/db-*) does not include src/instrumentation.ts or any src/app/** file, and two other implementers are running in parallel on files outside src/db. runMigrations() is exported and ready to be called from an instrumentation hook or a startup script by whichever task wires the app runtime to the DB (ACM-017 or a follow-up) -- flagging this explicitly since decision-006 describes startup auto-migration as the intended strategy.

What ACM-017 (Auth.js) still needs to add:
- Install next-auth v5 and @auth/drizzle-adapter; confirm the adapter's generated column set/table names against src/db/schema.ts's user/account/session/verificationToken tables for the exact installed adapter version before wiring the adapter (schema here was hand-matched from decision-006's documented shape, not generated from the package, since the package wasn't installed during ACM-016).
- Wire the DrizzleAdapter against getDb()/createDb() from src/db/client.ts.
- Add the Discord OAuth provider config and NextAuth() route handler/session callbacks.
- Wire migration auto-run into app startup (src/instrumentation.ts or equivalent), calling runMigrations() from src/db/migrate.ts -- left undone here per the scope note above.
- Add DATABASE_PATH (and any Auth.js secrets) to real .env, not just .env.example.

Tests added (src/__tests__/db-*.test.ts): migration creates all 7 tables (AC#1), PRAGMAs read back correctly on a fresh connection (AC#2), comp_builds allows repeated (comp_id,build_id) at different positions but rejects duplicate (comp_id,position) (AC#3), DATABASE_PATH env var controls resolved file location and creates its parent dir (AC#4).

pnpm-workspace.yaml: added better-sqlite3 to onlyBuiltDependencies (native binding compile) and esbuild to ignoredBuiltDependencies (drizzle-kit's transitive dep, no native build needed) to keep `pnpm install` non-interactive in CI/make check.

make check: green (lint warnings pre-existing/unrelated to this task, no errors; tsc, build, vitest all pass, 63 tests across 10 files).

## Review — ACM-016 (PR #14)

Verified against decision-001, decision-002, and task ACs. `make check` re-run locally: lint (2 pre-existing warnings, unrelated), tsc, next build, vitest (63/63) all green.

1. Auth.js compatibility (PRIORITY): hand-written user/account/session/verificationToken tables match the documented `@auth/drizzle-adapter` sqlite factory shape exactly (table names, column names/types, composite PKs on account(provider,providerAccountId) and verificationToken(identifier,token)). No mismatch found against the adapter's known contract. OK.

2. Migration correctness: drizzle/0000_overconfident_the_fury.sql matches schema.ts 1:1 (columns, FKs, ON DELETE CASCADE, both comp_builds indexes, user_email_unique). Applies cleanly from an empty DB per db-migrate.test.ts. OK.

3. comp_builds ordering — MEDIUM finding (not blocking ACM-016, flag for ACM-019): the unique index `comp_builds_comp_id_position_idx` on (comp_id, position) is a plain CREATE UNIQUE INDEX, not a deferrable constraint — SQLite only supports DEFERRABLE for PK/UNIQUE declared inline in CREATE TABLE, never for a separate CREATE INDEX. Swapping two positions (A:1↔B:2) via two sequential UPDATEs in one transaction will fail on the first UPDATE (immediate uniqueness violation). ACM-019 must either (a) use a single UPDATE with a CASE expression / batch statement that never produces a duplicate mid-transaction, or (b) stage through a temporary out-of-range position. This is inherent to decision-001's design, not an implementer defect — recording it now so ACM-019 doesn't get surprised.

4. Scope (pnpm-workspace.yaml, .gitignore): legitimate. `onlyBuiltDependencies: [better-sqlite3]` allows the required native build; `ignoredBuiltDependencies: [esbuild]` skips drizzle-kit's transitive dep which has no native build step — does not disable anything security-relevant. `/data/` gitignore entry only covers the local SQLite file directory, does not touch source paths.

5. instrumentation.ts skip: confirmed `runMigrations()` is exported from src/db/migrate.ts and independently tested (db-migrate.test.ts) against a throwaway file. Nothing in this diff calls it automatically — correctly deferred to ACM-017/startup-wiring task per the documented file-scope boundary. No dangling reference to an auto-migrate hook that doesn't exist.

6. better-sqlite3 native module: `next build` (Turbopack) completes successfully; better-sqlite3 is only imported by src/db/client.ts and test files, not by any app/route code yet, so nothing forces it into a client bundle. CI workflow (check.yml) runs `make check` on ubuntu-latest with the same pnpm-workspace.yaml build-script config — should compile the native binding fine.

No CRITICAL/HIGH findings. One MEDIUM (comp_builds reordering caveat, item 3) recorded for ACM-019 planning.

Verdict: LGTM
## Security audit — PR #14 (task/16-drizzle-schema)

### MEDIUM — no cross-tenant integrity check in comp_builds (schema.ts, comp_builds table)
`comp_builds.comp_id` -> comps.id and `comp_builds.build_id` -> builds.id are independent FKs with no constraint tying them to the same owning user. A comp owned by user A can reference a build_id owned by user B purely at the DB layer; nothing here prevents it. This is not exploitable yet (no auth/API in this PR) but it is a gap that ACM-018/019 (comp/build mutation endpoints) MUST close at the application layer: any "add build to comp" action must verify `comps.user_id === builds.user_id === session.user.id` before insert. Flag as a required check in ACM-018/019 acceptance criteria.

### MEDIUM — no visibility/public flag on builds or comps (schema.ts)
Neither `builds` nor `comps` has an `isPublic`/`visibility` column. ACM-021 (presumably public slug-based sharing) will need one. Without it, the natural shortcut is "slug lookup returns row regardless of ownership," which is an IDOR by construction — any guessable/enumerable id/slug would return a stranger's private comp/build content. Track as an explicit ACM-021 requirement: add a `visibility`/`isPublic` column (or a separate public-share table) and an ownership-or-public check in every read path, never trust a slug alone to imply "shareable."

### LOW — id primary keys are nanoid (builds/comps) vs UUID (users), acceptable, but note for ACM-021
nanoid ids for builds/comps (schema.ts `builds.id`/`comps.id`) are already fine as opaque identifiers for future public URLs (unlike a sequential integer), so this doesn't block anything — noting only because ACM-021's public slugs should reuse these ids rather than exposing internal user_id or leaking a separate sequential id.

### INFO — cascade behavior verified correct
`ON DELETE cascade` on `builds.user_id`, `comps.user_id`, `comp_builds.comp_id`, `comp_builds.build_id` (drizzle/0000_overconfident_the_fury.sql) is scoped correctly: deleting a user cascades to their own builds/comps only; deleting a build cascades only to comp_builds rows referencing that build (i.e., removes it from whatever comps included it), it does not delete the comps themselves or other users' data. No over-delete/orphan bug found. This is fine as designed, but combined with the MEDIUM above, a comp can end up silently losing a "slot" if another user deletes their own build that was cross-referenced — another argument for the ownership check in ACM-018/019.

### INFO — Auth.js tables shape (schema.ts users/accounts/sessions/verificationTokens)
`account.refresh_token`/`access_token`/`id_token` are nullable TEXT with no encryption-at-rest and no app-level redaction — this matches the standard Auth.js Drizzle adapter shape, so it's expected here, but ACM-017 must ensure these values are never logged (e.g. no console.log of the account object in callbacks) and that error handlers don't serialize the full session/account into error responses. No logging code exists yet in this PR to check — flag as an ACM-017 review item.

### INFO — DB file location / permissions: no issues found
`resolveDatabasePath()` (src/db/client.ts) resolves `DATABASE_PATH` via `path.resolve(process.cwd(), configured)` — env var is server-operator-controlled, not user input, so path traversal is not a realistic attack surface here. Default path `./data/app.db` is outside `public/`, not web-servable via Next.js static serving. `/data/` is gitignored (.gitignore line 51) and no db file is present in the diff/worktree. No secrets in `.env.example` (placeholder path only).

### INFO — pnpm-workspace.yaml build script allowlist
`onlyBuiltDependencies: [better-sqlite3]` is a narrow, correct allowlist for the one package that legitimately needs a native postinstall build step (compiling the SQLite binding) — this is the safer direction (default-deny + explicit allow), not a suppression of a security control. `ignoredBuiltDependencies` (sharp, unrs-resolver, esbuild) predates this PR per the diff context and isn't part of this change's scope. No CRITICAL/HIGH findings.

### Verdict
No CRITICAL or HIGH findings. Nothing blocks merge of this PR. Two MEDIUM items are architectural gaps to carry forward as explicit acceptance criteria into ACM-018/019 (cross-owner comp_builds check) and ACM-021 (visibility flag + ownership check before any public slug read, plus the JSON `content` TEXT columns being unsanitized app data that ACM-021 SSR pages and ACM-022 OG image generation must escape/sanitize before rendering — do not interpolate raw `content`/`content_type` into HTML or SSR output without going through the app's Zod-validated shape first).
<!-- SECTION:NOTES:END -->
