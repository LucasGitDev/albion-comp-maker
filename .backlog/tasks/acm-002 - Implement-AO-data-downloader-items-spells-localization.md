---
id: ACM-002
title: Implement AO data downloader (items + spells + localization)
status: To Do
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 13:32'
labels: []
milestone: m-0
dependencies:
  - ACM-001
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
scripts/sync-ao-data.ts step 1: download the 3 raw dumps to .cache/ with 7-day TTL and --force flag.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Downloads items.json, spells.json, localization.json to .cache/
- [ ] #2 Skips download if file exists and is < 7 days old
- [ ] #3 --force flag re-downloads regardless of age
- [ ] #4 Uses streaming fetch to avoid loading 94 MB localization into RAM at once
<!-- AC:END -->
