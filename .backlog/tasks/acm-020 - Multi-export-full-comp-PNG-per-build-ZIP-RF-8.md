---
id: ACM-020
title: 'Multi-export: full comp PNG + per-build ZIP (RF-8)'
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-09 03:07'
labels: []
milestone: m-6
dependencies:
  - ACM-015
priority: high
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three export targets: 1) build individual (done in ACM-015), 2) full comp as one PNG, 3) per-build PNGs as .zip.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Full comp export: all builds rendered in single container, exported as one PNG
- [ ] #2 ZIP export: one PNG per build, downloaded as comp-name.zip
- [ ] #3 All three targets use same html-to-image + proxy icon approach
<!-- AC:END -->
