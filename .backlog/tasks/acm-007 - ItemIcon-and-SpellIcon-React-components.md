---
id: ACM-007
title: ItemIcon and SpellIcon React components
status: In Progress
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 16:10'
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
