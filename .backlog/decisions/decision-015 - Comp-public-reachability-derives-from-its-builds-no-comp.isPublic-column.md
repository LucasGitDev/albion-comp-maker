---
id: decision-015
title: 'Comp public reachability derives from its builds, no comp.isPublic column'
date: '2026-09-07 20:24'
status: accepted
---
## Context

ACM-021 requires public SSR pages for both builds and comps by slug, with the
hard rule that a private entity must never be reachable via its public URL
(no existence oracle — see `BuildNotFoundError`/`CompNotFoundError` pattern
in `src/actions/builds.ts`/`comps.ts`).

`builds` already has an `is_public` column (added earlier, ACM-018) with a
`toggleBuildPublic` action and UI surfacing it. `comps` has **no** visibility
column at all — `src/db/schema.ts`'s `comps` table only has
`id/userId/name/slug/contentType/createdAt/updatedAt`, and there is no
`toggleCompPublic` action anywhere in the codebase. ACM-019's own review
(comp CRUD) never introduced one; it was out of that task's scope.

ACM-021's `touches` list is scoped to `src/app/build/[slug]/**`,
`src/app/comp/[slug]/**`, and read-only data-access modules — it explicitly
does not include a DB migration or `src/db/migrate.ts`. Adding a new
`comps.is_public` column plus a toggle action/UI is a separate, reviewable
unit of work, not a one-line addition to a read path.

## Decision

For v1, a comp has no visibility flag of its own. A comp is publicly
reachable by slug **if and only if every build placed in it (every
`comp_builds` row's referenced `builds` row) is itself `is_public`**. If a
comp has zero builds, or any single referenced build is private, the whole
comp page returns `notFound()` — same as a nonexistent slug, no distinct
response.

This keeps the "private content is never reachable, and missing vs private
is indistinguishable" invariant intact without inventing a new column this
task wasn't scoped to add, and it fails closed: a comp can only ever become
publicly visible by its owner explicitly making every one of its builds
public through the existing `toggleBuildPublic` action.

A follow-up task should add `comps.is_public` (migration + toggle action +
UI) if guild leaders need a comp to be public while containing private
builds, or need to make a comp private without touching each build
individually. Until then this is the only rule the public comp route
implements.

## Consequences

- No migration in this task; `src/db/schema.ts` is unchanged.
- `getPublicCompBySlug` must load every `comp_builds` row's `builds` row and
  reject (404) if any is `!isPublic` or fails `parseBuildContent`, not just
  check the comp row itself.
- A guild leader who wants a public comp must make each individual build in
  it public first; there is no comp-level override.
- Follow-up: consider `comps.is_public` in a future task if this proves too
  restrictive in practice.
