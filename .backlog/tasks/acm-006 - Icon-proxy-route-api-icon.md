---
id: ACM-006
title: Icon proxy route /api/icon
status: Done
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 15:48'
labels: []
milestone: m-1
dependencies:
  - ACM-001
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GET /api/icon?type=item|spell&id=...&q=1..5 — proxy to Render API, stream PNG, cache headers, validate id, fallback 1x1 PNG on error.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Validates id against /^[A-Z0-9_@]+$/
- [ ] #2 Sets Cache-Control: public, max-age=31536000, immutable
- [ ] #3 Returns transparent 1x1 PNG with 200 on upstream error
- [ ] #4 type=item fetches render.albiononline.com/v1/item/{id}.png, type=spell fetches /v1/spell/{id}.png
<!-- AC:END -->
