---
id: ACM-021
title: SSR public pages for build and comp with slugs (RF-9)
status: In Progress
assignee: []
created_date: '2026-09-07 13:34'
updated_date: '2026-09-07 20:27'
labels: []
milestone: m-7
dependencies:
  - ACM-049
  - ACM-057
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Server-rendered pages /[locale]/build/[slug] and /[locale]/comp/[slug]. Works without JS. Slug immutable, only owner sees private. Private comp: 404 for others (no token scheme for v1).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Page renders with SSR, no client JS required for read
- [ ] #2 Private comp/build: 404 for non-owner
- [ ] #3 Slug does not change when build/comp is renamed
- [ ] #4 Rename UI warns slug stays the same; "Regenerate link" button creates new slug (old URL 404s — warn user)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SECURITY (from ACM-016 audit, MEDIUM): neither builds nor comps has a visibility/isPublic column. Public slug pages are IDOR-by-omission if a slug lookup does not also check a public flag or ownership. Required before implementing: add the visibility column (migration) and make 'private build is NOT reachable via public slug URL' an explicit acceptance criterion with a test. Also: content/content_type are app-validated TEXT only — never interpolate raw stored JSON into SSR HTML (stored XSS).

Implemented public SSR routes for build/comp by slug (AC#1, AC#2).

- src/lib/public-content.ts: new read-only data-access module (anonymous, no requireSession()) with getPublicBuildBySlug/getPublicCompBySlug. Both collapse "nonexistent slug", "private", and "content fails parseBuildContent" into the same null return — the page layer turns null into notFound(), preserving the no-existence-oracle property from BuildNotFoundError/CompNotFoundError.
- src/lib/build-card-lookups.ts: server-side item/spell name + spellGroupsByItem lookups for BuildCard, read directly from ao-data.json via fs (mirrors src/app/api/items/route.ts's own read, no HTTP round trip needed since we're already server-side).
- src/app/build/[slug]/page.tsx and src/app/comp/[slug]/page.tsx: plain (non-locale-prefixed) SSR routes. i18n (ACM-023) is not implemented yet and will relocate these routes once it lands.
- Content validation: uses the tolerant parseBuildContent (decision-013) on the read path, never the strict write validator. A build whose content fails parsing 404s rather than rendering unvalidated data.
- Comp visibility: comps have no is_public column (never added by ACM-018/019). Recorded decision-015: a comp is publicly reachable iff it has >=1 build and every comp_builds row's referenced build is is_public with valid content; any single private/invalid build makes the whole comp 404 (no partial render, no "hidden slot" leak). No migration added — out of this task's scope per the touches list.
- Comp entries render in comp_builds.position order (query orders explicitly; a test inserts rows out of position order and asserts the sorted output).
- Reused BuildCard as-is; did not touch ExportBar.tsx or introduce any sticky/fixed ancestor between the page and #capture-root.
- comp.name / comp_builds.label rendered as plain JSX text nodes, never dangerouslySetInnerHTML.

Tests added: src/__tests__/public-content.test.ts (data-access: public/private/nonexistent/invalid-content build, comp position ordering, comp with a private build -> null, nonexistent comp), src/__tests__/public-pages.test.tsx (page-level: renders by slug, notFound() digest assertion for private/missing, comp position-order rendering, comp notFound()).

Out of scope / follow-up needed:
- AC#4 ("Regenerate link" button + rename-keeps-slug warning in the editor UI) is editor-side UI work, not part of this task's touches (src/app/build/[slug]/**, src/app/comp/[slug]/**, data-access, tests). Needs its own task.
- AC#3 (slug immutable across rename) was already true before this task — generateSlug() is only called at row creation (src/lib/slug.ts), updateBuild/updateComp never touch the slug column. Not something this task changed, just verified.
- decision-015: comps.is_public follow-up task recommended if a comp needs to be public while containing a private build, or vice versa.
<!-- SECTION:NOTES:END -->
