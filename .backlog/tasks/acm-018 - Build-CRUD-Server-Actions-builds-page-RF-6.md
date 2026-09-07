---
id: ACM-018
title: Build CRUD Server Actions + /builds page (RF-6)
status: Done
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 19:07'
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

SECURITY (audit ACM-018 PR#28, read-only): Overall auth boundary is solid — every exported Server Action in src/actions/builds.ts calls requireSession() itself, mutations (update/toggle/delete) double-scope the WHERE by both id AND userId (not just a JS-side ownership check), forkBuild correctly bounds cross-user reads to isPublic (verified: private+not-owned and not-found both throw the same BuildNotFoundError, no 403/404 oracle), and no action accepts a caller-supplied userId. slug.ts uses nanoid(8) (CSPRNG-backed, ~48 bits entropy) appended to the name, non-enumerable, collision handled by DB unique index + insert (though note: no explicit catch/retry on unique-constraint violation for the slug — a collision would surface as a raw DB error to the caller instead of a friendly retry, MEDIUM/robustness not security). Findings requiring action before merge:\n\n1. MEDIUM — src/actions/builds.ts saveBuild/updateBuild: 'content' (data_json) is typed as 'string' and passed straight from client input to db.insert/update with zero validation at the Server Action boundary. schema.ts comment claims content is 'validated by a shared Zod schema at the application layer' but no such schema/import exists in builds.ts — grep for zod in src/actions confirms none. Concretely: (a) no size cap -> a client can submit an arbitrarily large string as DoS/storage abuse against SQLite; (b) no shape/schema validation -> arbitrary JSON (or non-JSON string) is persisted, which is the direct precursor to stored XSS once ACM-021 renders public build pages SSR from this column. Must add a Zod schema (parse, not just typecheck) with a max length bound before insert/update, or block merge of ACM-021 until this lands.\n\n2. LOW — rate-limit.ts checkWriteRateLimit is called AFTER requireSession() in every action (correct ordering, keyed on session.user.id not client input, so no bypass via spoofed key) and fails CLOSED (throws) rather than open — no issue found here, noting as verified-clean per task's own AC#7.\n\n3. LOW — src/app/builds/page.tsx: catches any error from listMyBuilds() (including RateLimitError or a future DB error) and silently redirects to '/', which is fine for the not-authenticated case but swallows unrelated errors indistinguishably; acceptable for now given uniform-error posture but worth a distinct handling later.\n\nVerdict: no CRITICAL/blocking IDOR or missing-authz found — the three prior audit requirements (ACM-016 ownership scoping, ACM-017 requireSession in every action, ACM-032 explicit self-check) are all satisfied in this PR. Recommend fixing item 1 (data_json validation) before or in the same PR as ACM-021 (public SSR pages), since that is where the stored-XSS risk becomes live; not necessarily a hard blocker for ACM-018 merging in isolation since builds are not yet publicly rendered.

REVIEW PR #28 (task/18-build-crud) — findings:

[HIGH] drizzle/0001_add_build_slug_public_forked.sql:1 — `ALTER TABLE builds ADD slug text NOT NULL;` has no DEFAULT. Verified locally: SQLite raises `Cannot add a NOT NULL column with default value NULL` and the ALTER fails as soon as the `builds` table contains any existing row (empty table is fine, but that's an unverified assumption about every deploy target). Scenario: any environment where a build row was ever inserted (manual testing, drizzle studio, a seed script, or a future rebase order) before this migration runs → `npm run db:migrate` (or equivalent) crashes mid-deploy, app is down, and there is no rollback statement in the file. Needs either `DEFAULT ''` + app-level backfill pass before the UNIQUE index, or a two-step migration (add nullable slug → backfill with generated slugs per row → ALTER to NOT NULL → add unique index). Currently untested against non-empty tables (all diff tests start from a fresh migrated tmp DB, so this failure mode is invisible to the test suite).

[MEDIUM] src/lib/rate-limit.ts — `buckets` Map never evicts entries (no TTL sweep, no LRU cap). Every distinct userId that ever calls a write action leaves a permanent entry for the process lifetime. Not an immediate leak per-key (window resets), but the Map's key count is unbounded as the user base grows, and the module docstring only calls out the multi-instance limitation, not the missing eviction. Low urgency for current scale but should be tracked before this pattern is reused elsewhere.

[LOW] src/app/builds/page.tsx — builds a `/builds` route ahead of the ACM-023 locale-prefixed routing work; acknowledged in the file's own comment as a temporary location. Not a defect, just a note that it will need to move.

Verified as correct / not findings:
- AC#1–#7 all have real Server Action logic backed by ownership-scoped WHERE clauses (userId filter on every select/update/delete), not just mock-shaped tests — src/actions/builds.ts loadOwnedBuild + repeated `and(eq(id), eq(userId))` on update/delete/toggle.
- Slug immutability: updateBuild's `.set({...})` only ever spreads `name`/`role`/`content` conditionally from UpdateBuildInput, which has no `slug` field in its type — there is no code path, including a hypothetical full spread of client input, that could reach the slug column since the type itself excludes it.
- duplicateBuild and forkBuild both call `generateSlug()` again for the new row (new nanoid suffix), never reuse `source.slug`.
- forkBuild inserts with `userId: session.user.id` (the caller), not the source owner — confirmed by test "copies a public build into the forking user's library and sets forkedFrom".
- Rate limiter: window/threshold logic re-traced by hand — allows exactly 30 writes then throws on the 31st (no off-by-one); keyed correctly by `session.user.id`.
- Scope: diff touches only drizzle/*, src/actions/*, src/app/builds/page.tsx, src/db/schema.ts, src/lib/{rate-limit,slug}.ts, and two test files. src/components/editor/, src/app/api/, package.json, package-lock.json untouched.
- Rebase risk: branch is 7 commits behind main, but main's changes since divergence only touch item-picker/design-token files and unrelated backlog docs — no file overlap, no drizzle migration number collision (main is still at 0000). `git merge-tree` reports no conflicts.

Verdict: BLOCKED: 1 finding (HIGH — migration not safe against non-empty builds table). MEDIUM rate-limiter eviction gap recorded as debt, does not block.

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
