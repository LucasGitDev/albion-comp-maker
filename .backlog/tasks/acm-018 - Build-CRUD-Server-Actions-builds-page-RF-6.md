---
id: ACM-018
title: Build CRUD Server Actions + /builds page (RF-6)
status: In Review
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 19:00'
labels: []
milestone: m-5
dependencies:
  - ACM-015
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Save, list, edit, delete, duplicate, toggle public/private, fork builds. /[locale]/builds page listing owner's builds.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Save build: creates row with nanoid id, immutable slug (name + random suffix)
- [ ] #2 Edit build: validates session.user.id === owner_id
- [ ] #3 Duplicate: copies data_json to new row with new slug
- [ ] #4 Fork: copies to authenticated user's library, sets forked_from
- [ ] #5 Toggle public: flips is_public flag
- [ ] #6 Delete: hard delete, only by owner
- [ ] #7 Rate limit: max 30 writes/min per user
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SECURITY (from ACM-016 audit, MEDIUM): builds/comps ownership is not enforced by the schema. Every CRUD Server Action must scope queries by the session user_id — never trust an id from the client alone (IDOR). Add a test proving a user cannot read/update/delete another user's build.

SECURITY (ACM-017 audit, MEDIUM): middleware matcher is ['/builds/:path*','/comp/new'] and is explicitly UX-only defense-in-depth, NOT the authorization boundary. Every Server Action must call requireSession() itself — matchers drift silently as routes are added. Add a regression test asserting Server Actions reject unauthenticated calls regardless of middleware.

SECURITY (auditoria ACM-032, MEDIUM): hoje src/proxy.ts e o UNICO limite de autenticacao real para /builds/:path* e /comp/new. O comentario no arquivo afirma que 'Server Actions self-check auth() regardless' — isso e ASPIRACIONAL, nao verdadeiro: 'grep -rn "use server" src' nao retorna nada, nenhuma Server Action existe ainda. src/auth/session.ts expoe requireSession() mas NINGUEM o chama. Ao implementar as mutations desta task, chamar requireSession() explicitamente em cada Server Action / route handler — nao confiar no proxy como unica defesa. Verificado contra Next 16.3.4.

Implementation (ACM-018): added src/actions/builds.ts (Server Actions: saveBuild, updateBuild, duplicateBuild, forkBuild, toggleBuildPublic, deleteBuild, listMyBuilds) plus src/actions/build-errors.ts (BuildNotFoundError — kept out of the "use server" file since it may only export async functions). Added src/lib/slug.ts (immutable slug: lowercase name + random nanoid suffix, generated once at creation, never on edit) and src/lib/rate-limit.ts (in-memory module-scope Map, 30 writes/min per user — no new dependency; documented limitation: state is per-process, resets on restart, not shared across horizontally scaled instances).

Schema (src/db/schema.ts): added builds.slug (unique, not null), builds.isPublic (bool, default false), builds.forkedFrom (self-referencing FK, set null on delete of source). Migration: drizzle/0001_add_build_slug_public_forked.sql.

Security: every Server Action calls requireSession() first and every query filters by session.user.id — never accepts a userId from the caller. loadOwnedBuild() returns the same BuildNotFoundError whether a build id doesn't exist or belongs to another user (no existence leak / IDOR). forkBuild additionally requires the source build to be public (or already owned by the caller) before copying it.

Route: /builds (plain route, not /[locale]/builds — ACM-023 will relocate this once locale-prefixed routing lands).

Tests (src/__tests__/builds-actions.test.ts, 16 cases): unauthenticated calls rejected for every action regardless of middleware; cross-user IDOR attempts on read/update/delete/toggle/duplicate/fork all fail with "Build not found"; slug stays immutable across updateBuild; duplicateBuild/forkBuild produce a new id+slug and copy content; forkBuild sets forkedFrom and refuses private builds not owned by the caller; rate limit rejects the 31st write/min and tracks limits per-user independently. Full suite: 210/210 passing, make check green.

Out of scope respected: did not touch src/components/editor/, src/app/api/, package.json or the lockfile. No UI "save" button wired into the editor — that integration belongs to whichever task wires the editor to these actions.

RE-REVIEW (fix delta, PR #28) — BLOCKED: 1 finding

[CRITICAL] drizzle/0001_add_build_slug_public_forked.sql — the table-rebuild silently CASCADE-DELETES comp_builds rows referencing pre-existing builds. Empirically verified (throwaway vitest spec, not committed): seeded builds row b1 + comps row c1 + comp_builds row cb1 (build_id=b1) on migration 0000-only DB, then ran the rest of the migrations via runMigrations(). Result: migration completes with NO error, but comp_builds ends up with 0 rows (cb1 gone). Root cause: src/db/client.ts sets `foreign_keys = ON` on every connection (including the migrator's), and comp_builds.build_id → builds.id has ON DELETE CASCADE (schema.ts:146). Step 3 of the migration (`DROP TABLE builds`) is a real delete under FK enforcement, so SQLite cascades it into comp_builds before the rename ever happens — this is not the "dangling FK" footgun the task described, it's worse: a silent, successful, undetected data-loss path. Any environment that already has a comp referencing a build before this migration runs will lose that comp_builds row permanently, with no error surfaced anywhere.
  Failure scenario: production/staging DB has 1 existing build and 1 comp containing it (comp_builds row) before deploying this migration → after migration, migrate() returns cleanly, `make check` and CI pass, but the comp silently shows 0/fewer slots because its comp_builds link is gone.
  Fix needed (do not implement yet, just confirming shape for the implementer): either (a) wrap the rebuild in `PRAGMA foreign_keys=OFF` for the duration of this migration file (SQLite recommends this for the "12 steps to a table schema change" table-rebuild pattern precisely because of this cascade hazard) plus a `PRAGMA foreign_key_check` before turning it back on, or (b) rebuild comp_builds too within the same migration so the FK is always satisfied by the same statement batch. Also extend src/__tests__/db-migrate.test.ts to seed a comps + comp_builds row (not just a bare build) and assert it still exists with the correct build_id after migration — the current test does not cover this and would pass with the bug present.

Confirmed NOT disturbed / already fine (re-verified, not re-litigated):
- src/actions/builds.ts: zero diff between the pre-fix commit (cc92602) and the latest fix commit (cf6a2a5) — authz/ownership-scoped WHERE clauses, slug immutability, fork/duplicate semantics untouched by this delta.
- Rebase integrity: `git merge-base HEAD origin/main` == origin/main tip (84ae1f2) — linear rebase, nothing from main lost or diverged.
- Backfill correctness: unique index `builds_slug_idx` is created (line 34) strictly after the backfill INSERT (line 27-28) and after DROP+RENAME; `slug = id` is safe because `id` was the old table's NOT NULL PRIMARY KEY, so uniqueness/non-null of the backfilled slug cannot fail.
- Column-data preservation: the rebuild's INSERT explicitly enumerates and copies every pre-existing column (id, user_id, name, role, content, created_at, updated_at) — no silent loss on non-slug columns.
- src/db/migrate.ts migrationsFolder param: trivial, correctly defaults to the real drizzle/ folder for prod use.

[MEDIUM] src/lib/rate-limit.ts — eviction is by Map insertion order, which is NOT the same as recency of activity (`bucket.count += 1` does not reorder a Map key). A user whose bucket was created early and stays continuously active is "oldest" and gets evicted first once the map exceeds 10k entries, silently resetting their own window/count to 0. Exploitable only by an attacker who can generate enough distinct userIds (e.g. many throwaway accounts) to push the bucket count past 10k faster than their own window closes — a real but high-effort bypass of the intended 30 writes/min cap. Same severity tier as the original review's finding (documented single-process limitation); not a regression, just carried over. No action required to unblock this PR, but should be tracked before this limiter is trusted for anything beyond best-effort abuse mitigation.

Verdict: BLOCKED: 1 finding (CRITICAL migration data-loss). Return to implementer: drizzle/0001_add_build_slug_public_forked.sql cascades-deletes comp_builds rows on DROP TABLE builds because foreign_keys=ON; fix by disabling FK enforcement for this migration's duration (or rebuilding comp_builds in the same batch) and add a comp_builds-seeded regression test to src/__tests__/db-migrate.test.ts.
<!-- SECTION:NOTES:END -->
