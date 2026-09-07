---
id: ACM-007
title: ItemIcon and SpellIcon React components
status: Done
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 16:22'
labels: []
milestone: m-1
dependencies:
  - ACM-001
ordinal: 7000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Client components that render icons via /api/icon — never direct Render API URLs. Used everywhere in the app.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ItemIcon renders <img src=/api/icon?type=item&id=...&q=...>
- [ ] #2 SpellIcon renders <img src=/api/icon?type=spell&id={sprite}>
- [ ] #3 Both have fallback UI (grey square) while loading
- [ ] #4 alt prop required for accessibility
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Adversarial review of PR #8 (branch task/7-icon-components): LGTM, no CRITICAL/HIGH/MEDIUM findings.

Verified: naturalWidth<=1 missing-state detection reads live currentTarget (race-safe across src changes); render-phase state reset in useIconStatus cannot loop and is StrictMode-safe; Tailwind v4 size classes are static lookups, all 5 --color-icon-* tokens are referenced; alt required at type level, empty SpellIcon state uses role=img/aria-label with no <img>, decorative handled on both components; 22/22 tests pass and assert real DOM state, naturalWidth<=1 simulated via Object.defineProperty+fireEvent.load (faithful given jsdom has no real image decode); tsc --noEmit and eslint clean (2 no-img-element warnings only, expected per spec's plain-<img> rationale for html2canvas export); vitest.config.ts/setup.ts changes (globals:true, jest-dom) are in-scope and don't regress existing suite.

LOW (non-blocking): consider an inline eslint-disable with a comment citing the export rationale on the two <img> elements, to make the deliberate no-img-element deviation self-documenting for future maintainers.
<!-- SECTION:NOTES:END -->
