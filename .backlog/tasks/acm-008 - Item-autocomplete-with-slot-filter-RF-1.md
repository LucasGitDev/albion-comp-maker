---
id: ACM-008
title: Item autocomplete with slot filter (RF-1)
status: To Do
assignee: []
created_date: '2026-09-07 13:32'
labels: []
milestone: m-2
dependencies:
  - ACM-005
  - ACM-007
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Search input that filters ao-data.json items by name (EN+PT) and id, grouped by slot. Sub-500ms response with 2000+ items using in-memory index.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Debounced input, results appear < 50 ms after debounce
- [ ] #2 Filters by slot type (mainhand, offhand, head, etc.)
- [ ] #3 Shows ItemIcon + name + tier per result
- [ ] #4 Keyboard navigable (arrow keys, enter, escape)
<!-- AC:END -->
