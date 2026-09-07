---
id: ACM-022
title: Open Graph image generation via Satori (RF-9)
status: To Do
assignee: []
created_date: '2026-09-07 13:34'
labels: []
milestone: m-7
dependencies:
  - ACM-018
  - ACM-019
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
/api/og/comp/[slug] and /api/og/build/[slug] generate 1200x630 PNG using Satori. Simplified layout (not full preview component — Satori is not the browser).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 OG image shows comp title, author, build names and role icons
- [ ] #2 Image reachable without auth for public builds/comps
- [ ] #3 Link pasted in Discord shows OG preview
- [ ] #4 meta og:image, og:title, og:description set on public pages
<!-- AC:END -->
