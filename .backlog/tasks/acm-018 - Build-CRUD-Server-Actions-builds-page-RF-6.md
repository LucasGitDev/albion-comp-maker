---
id: ACM-018
title: Build CRUD Server Actions + /builds page (RF-6)
status: In Review
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 18:52'
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
<!-- SECTION:NOTES:END -->
