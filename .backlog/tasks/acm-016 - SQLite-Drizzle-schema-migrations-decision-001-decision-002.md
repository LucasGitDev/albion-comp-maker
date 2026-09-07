---
id: ACM-016
title: 'SQLite + Drizzle schema + migrations (decision-001, decision-002)'
status: In Progress
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 17:04'
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
