---
id: ACM-024
title: Fix sync-ao-data.ts upstream URLs (ao-bin-dumps restructured)
status: In Progress
assignee: []
created_date: '2026-09-07 15:48'
updated_date: '2026-09-07 15:50'
labels: []
milestone: m-0
dependencies: []
priority: high
ordinal: 24000
---

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
ao-bin-dumps removeu formatted/spells.json e formatted/localization.json (404). Apenas formatted/items.json existe. Root spells.json/localization.json têm schema XML-converted diferente. Bloqueia ACM-005 AC-3/AC-4. Investigar: novo mirror, endpoint oficial Albion, ou adaptar parser ao schema raw.
<!-- SECTION:NOTES:END -->
