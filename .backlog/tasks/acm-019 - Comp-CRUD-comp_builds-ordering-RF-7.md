---
id: ACM-019
title: Comp CRUD + comp_builds ordering (RF-7)
status: Done
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 19:38'
labels: []
milestone: m-6
dependencies:
  - ACM-016
  - ACM-018
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Comp entity: create, edit, delete, drag-reorder builds within comp. Each comp_builds row has position, label, count.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Create comp: nanoid id, immutable slug
- [ ] #2 Add build to comp from user library or public search
- [ ] #3 Drag reorder updates position in DB
- [ ] #4 count field editable per comp_builds row
- [ ] #5 label field editable inline
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SECURITY (from ACM-016 audit, MEDIUM): comp_builds has independent FKs to comps.id and builds.id with NO constraint that both rows share the same user_id. Without an app-layer ownership check before inserting into comp_builds, a user can attach ANOTHER USER'S build to their own comp. Required: verify ownership of both the comp and the build in the Server Action before insert, and cover it with a test that attempts the cross-user attach and expects rejection.

ORDERING CONSTRAINT (from ACM-016 review, MEDIUM): the unique index comp_builds_comp_id_position_idx on (comp_id, position) is a plain CREATE UNIQUE INDEX, which SQLite CANNOT make deferrable (only inline CREATE TABLE constraints support DEFERRABLE). Swapping two positions (A:1<->B:2) with two sequential UPDATEs inside one transaction FAILS on the first statement. Reordering must use either a single CASE-based UPDATE or a staged temp-position approach. Add a test that reorders builds within a comp and asserts the final ordering.

SECURITY (ACM-017 audit, MEDIUM): same as ACM-018 — comp Server Actions must call requireSession() independently, not rely on the middleware matcher. Test unauthenticated rejection directly.

SECURITY (auditoria ACM-032, MEDIUM): hoje src/proxy.ts e o UNICO limite de autenticacao real para /builds/:path* e /comp/new. O comentario no arquivo afirma que 'Server Actions self-check auth() regardless' — isso e ASPIRACIONAL, nao verdadeiro: 'grep -rn "use server" src' nao retorna nada, nenhuma Server Action existe ainda. src/auth/session.ts expoe requireSession() mas NINGUEM o chama. Ao implementar as mutations desta task, chamar requireSession() explicitamente em cada Server Action / route handler — nao confiar no proxy como unica defesa. Verificado contra Next 16.3.4.

SECURITY (audit of PR #35 / task/19-comp-crud): Reviewed src/actions/comps.ts, comp-errors.ts, schema.ts, migration 0002.

RESULT: No CRITICAL or HIGH findings. Implementation correctly follows the ACM-018 reference pattern.

Verified good:
1. IDOR — every action (createComp, updateComp, deleteComp, listMyComps, listCompBuilds, addBuildToComp, removeBuildFromComp, updateCompBuild, reorderCompBuilds) calls requireSession() first and carries the ownership predicate (userId/compId) in the actual WHERE clause of the mutating statement, not just a preceding read (no TOCTOU). Confirmed by tests in src/__tests__/comps-actions.test.ts lines 97-224.
2. Cross-entity join (addBuildToComp, comps.ts lines ~172-212) correctly requires BOTH comp ownership (loadOwnedComp) AND (build.userId === session.user.id OR build.isPublic) before insert. This closes the ACM-016 gap. Tests explicitly cover: comp not owned (line 130), private build not owned by attacher (line 145, 'cross-user build attach / ACM-016'), and the positive public-build case (line 159). The denial test asserts the CompBuildRefNotFoundError('Build not found') message, same shape as missing-row, so no existence oracle for private builds owned by other users.
3. reorderCompBuilds (comps.ts ~275-330) validates orderedCompBuildIds is an EXACT permutation of the target comp's existing compBuilds ids (length match, no dupes via Set, every id in existingIds) before doing any write. Foreign ids from another comp/user are rejected via CompBuildReorderInvalidError. Ownership of the comp itself checked via loadOwnedComp first. Tested (lines 211-223, 282-306).
4. removeBuildFromComp / updateCompBuild use loadOwnedCompBuild which chains loadOwnedComp(userId, compId) then scopes the compBuilds row by (id, compId) — and the mutating statement repeats (id, compId) in its own WHERE. Tested cross-user denial (lines 181-209).
5. Error messages: CompNotFoundError and CompBuildRefNotFoundError deliberately return identical shape for 'row missing' vs 'row belongs to another user' per the BuildNotFoundError precedent — no existence oracle.
6. Rate limiting: checkWriteRateLimit(session.user.id) called on every write action, keyed on server-trusted session id. Tested (31st write rejected).
7. Slug: generateSlug() uses nanoid(8) (CSPRNG-backed), immutable — updateComp's input type has no slug field and the update statement never touches comps.slug. No update path can regenerate it.
8. Migration 0002: comp_builds.label added as plain nullable ALTER TABLE (safe); comps.slug rebuild-and-backfill pattern documented, comp_builds preserved via ON DELETE CASCADE, covered by db-migrate.test.ts per notes.

MEDIUM (unresolved, flag for follow-up, does not block this merge per task's own stated scope-note reasoning but should be tracked): comps.name and comp_builds.label have NO length bound or validation at the Server Action layer (createComp/updateComp/addBuildToComp/updateCompBuild all pass these straight to Drizzle .values()/.set() as plain text columns with no CHECK constraint and no Zod/class-validator schema). The task's own implementation notes invoke the ACM-049 precedent ('user-controlled persisted content must be validated') but conclude no validation is needed because these are 'plain scalars' rather than JSON blobs — this reasoning addresses JSON-shape validation risk but does NOT address the storage-abuse / unbounded-text risk ACM-049 is about. A user can currently pass an arbitrary-length string (megabytes) for name or label with no server-side cap, which is a storage-abuse vector today and will become an untrusted-content-served-to-third-parties vector once ACM-021 SSR-renders comps publicly. Recommend adding a bounded Zod/length check (e.g. name <= 100 chars, label <= 200 chars) before the ACM-021 public-render task starts, and treat this note as a blocking prerequisite for ACM-021, not for ACM-019 itself.

VERDICT: No CRITICAL/HIGH blockers found. LGTM for merge on IDOR/authz/reorder/slug axes. One MEDIUM (label/name unbounded length) should be fixed before ACM-021 ships public SSR rendering of comps, but does not need to block this PR.
<!-- SECTION:NOTES:END -->
