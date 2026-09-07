---
id: ACM-013
title: 'Build card preview component — single source of truth (RF-4, RF-5)'
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
labels: []
milestone: m-3
dependencies:
  - ACM-008
  - ACM-009
  - ACM-010
  - ACM-011
  - ACM-012
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The preview component IS the export component. No separate layout for export. Supports vertical and grid layouts, theme tokens.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Renders BuildState as visual card
- [ ] #2 vertical layout: icon left, name right, spells below
- [ ] #3 grid layout: builds side by side, role as column header
- [ ] #4 Same React component tree used for both screen preview and PNG export
<!-- AC:END -->
