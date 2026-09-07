---
id: ACM-021
title: SSR public pages for build and comp with slugs (RF-9)
status: In Review
assignee: []
created_date: '2026-09-07 13:34'
updated_date: '2026-09-07 20:31'
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

SECURITY (audit of PR #41, task/21-ssr-public-pages): VERDICT = PASS, no CRITICAL/HIGH blockers found. Findings:

1. [INFO/PASS] Visibility enforcement: getPublicBuildBySlug/getPublicCompBySlug (src/lib/public-content.ts) check row.isPublic in JS immediately after a single-row fetch, before any other work — not a SQL WHERE clause, but functionally equivalent since the row is discarded on failure and nothing derived from it is returned or cached. LOW note: pushing isPublic into the WHERE clause would be defense-in-depth (protects against a future refactor that forgets the check) but is not a live vulnerability today. Verified empirically via public-content.test.ts: private build -> null, nonexistent slug -> null.

2. [PASS] Existence oracle: nonexistent slug, private build, and content that fails parseBuildContent all collapse to null in the data-access layer, and the page layer (build/[slug]/page.tsx, comp/[slug]/page.tsx) calls Next's notFound() uniformly for all three — confirmed by public-pages.test.tsx asserting the same digest (NEXT_HTTP_ERROR_FALLBACK;404) for private/missing/invalid cases. No differing status/body/error detail. Did not measure timing side-channels (DB lookup vs DB lookup+parse failure) — theoretically a sub-ms timing difference exists between 'no row' (1 query) and 'private row'/'invalid content row' (1 query, short-circuit) but this is not practically exploitable over HTTP and is LOW/accepted risk, not a blocker.

3. [PASS] Unvalidated content cannot render: public-content.ts imports parseBuildContent (the tolerant read schema) from build-schema.ts, never the strict write validator (validateBuildContentForWrite / buildStateSchema.parse). A row whose content fails parseBuildContent returns null -> notFound(), confirmed by the 'corrupted-build' test case. Legacy builds without maxEnchant on equipped items are still accepted (equippedItemReadSchema backfills to 4), consistent with decision-013.

4. [PASS] XSS: comp.name and comp_builds.label render as plain JSX text nodes (React auto-escapes), no dangerouslySetInnerHTML anywhere in the audited files. accent is validated at write time by accentSchema (regex ^#[0-9a-fA-F]{6}$) AND independently re-validated at render time by resolveAccent() (src/components/build-card/tokens.ts) via HEX_COLOR_PATTERN before being placed into style={{ color/backgroundColor: accent }} — so even a hypothetical legacy row with a non-hex accent value cannot reach a style attribute unsanitized; it falls back to the role default. No user-controlled value reaches href/src/CSS url().

5. [PASS] Data over-exposure: PublicBuild/PublicComp types (src/lib/public-content.ts) are explicit narrow shapes (id, name, role, slug, content / id, name, slug, contentType, entries) built field-by-field from the DB row — never a raw spread of the Drizzle row into the RSC payload. userId, createdAt, forkedFrom, isPublic, and other builds'/comps' rows are not present in the returned objects and cannot leak via RSC serialization.

6. [PASS] build-card-lookups.ts: ARTIFACT_PATH is a hardcoded constant (path.join(process.cwd(), 'src', 'data', 'ao-data.json')) — no user input reaches the fs path, so no traversal risk. Read is cached at module scope (loadItemsByUniquename memoizes + dedupes concurrent inflight reads), so it is not re-read from disk per request. Missing-file case is caught and degrades to empty lookups (itemNames/spellNames/spellGroupsByItem = {}) rather than throwing an unhandled 500 — no stack trace leak.

7. [MEDIUM] Enumeration / rate limiting: slugs are name-derived-prefix + nanoid(8) suffix (src/lib/slug.ts), giving large per-slug search space, so brute-forcing a specific private slug is infeasible. However grep across src/ found zero rate-limiting on any route, including these new anonymous public routes. This is a pre-existing gap (not introduced by this task) but is now more exposed since these routes are the first anonymous-facing surface — an attacker can hammer distinct guessed/leaked slugs or scrape at will with no throttling. Recommend a follow-up task for basic rate limiting (e.g. per-IP) on the /build/[slug] and /comp/[slug] routes; not a blocker for this PR since it's a pre-existing infra gap, not a regression.

8. [PASS] Comp all-or-nothing rule (decision-015): getPublicCompBySlug iterates all comp_builds rows in position order and returns null on the FIRST private-or-invalid build encountered — confirmed no partial entries array is ever returned when any build fails the check (test: 'returns null when the comp has a private build (no partial render)'). No 'hidden slot' leak.

No CRITICAL or HIGH findings. Recommend merge; open a follow-up task for rate limiting (item 7) at a normal (non-blocking) priority.

REVIEW (PR #41) — BLOCKED: 2 HIGH + 3 MEDIUM findings (correctness/design/product, security audited separately)

HIGH #1 — decision-015 all-or-nothing 404 has no owner-facing explanation. A guild leader with 7 public builds + 1 private gets a silent 404 on /comp/<slug> indistinguishable from "comp doesn't exist" — no UI anywhere tells the owner which build is blocking public reachability. This is the product's primary sharing use case failing silently. Security half of decision-015 (no partial render, no existence oracle) is correctly implemented (verified in getPublicCompBySlug). Needs: owner-facing diagnostic (e.g. show blocking build(s) when owner views their own dead link, or a status indicator on /builds) before merge — does not require full comps.is_public migration.

HIGH #2 — src/components/build-card/BuildCard.tsx hardcodes id="capture-root" unconditionally. src/app/comp/[slug]/page.tsx renders one BuildCard per comp entry in a .map() — any comp with 2+ builds (the normal case) emits duplicate #capture-root ids in the DOM, violating the ACM-029/decision-010 uniqueness contract. No test covers this (public-pages.test.tsx only checks #capture-root on the single-build page). Needs: give BuildCard an optional id override, or namespace ids per entry on the comp page.

MEDIUM #3 — decision-015 defers comps.is_public citing "needs a migration," but no follow-up task exists in the backlog (checked task list) despite implementation notes and the decision doc both saying one should be created. Given finding #1, recommend creating it now.

MEDIUM #4 — AC#4 (rename-warning / regenerate-link UI) legitimately descoped as editor-side UI outside this task's touches — but again no follow-up task exists in the backlog. Create one.

MEDIUM #5 — src/lib/build-card-lookups.ts duplicates ACM-043's (src/app/api/items/route.ts) module-scope cache + in-flight-dedup pattern for reading ao-data.json, as a second independent reader/cache instead of a shared loader. Not a per-request disk read (correctly memoized), so no perf issue, but a maintenance/drift risk — recommend extracting a shared loadAoData() both modules call.

VERIFIED OK: all 5 required AC test cases present and guard-load-bearing (public-content.test.ts, public-pages.test.tsx); comp position-ordering correct (ACM-019, out-of-order insert test); no existence oracle preserved; scope respected (only touches listed files, no editor/store/ExportBar/rate-limit/migrate/package.json changes); export-bar.test.tsx and ACM-029 guard pass; rtk make check green (lint/typecheck/build/336 tests pass); i18n relocation note present for ACM-023; rebase risk low (main moved 4 commits ahead, no file overlap).
<!-- SECTION:NOTES:END -->
