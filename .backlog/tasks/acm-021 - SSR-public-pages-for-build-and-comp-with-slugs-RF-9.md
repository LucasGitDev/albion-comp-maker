---
id: ACM-021
title: SSR public pages for build and comp with slugs (RF-9)
status: To Do
assignee: []
created_date: '2026-09-07 13:34'
labels: []
milestone: m-7
dependencies:
  - ACM-018
  - ACM-019
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
