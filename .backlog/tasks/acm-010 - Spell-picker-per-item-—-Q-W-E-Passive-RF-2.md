---
id: ACM-010
title: Spell picker per item — Q/W/E/Passive (RF-2)
status: In Progress
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 17:40'
labels: []
milestone: m-2
dependencies:
  - ACM-005
  - ACM-007
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After selecting an item, render only its valid spells grouped by slot Q/W/E and Passives. Chip UI: unselected=desaturated, selected=colored. Impossible to pick invalid spell.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Spells loaded from resolved actives/passives in ao-data for selected item
- [ ] #2 Q/W/E groups shown only when item has spells for that slot
- [ ] #3 Passive spells shown in separate group
- [ ] #4 Tooltip shows spell name in active locale
- [ ] #5 SpellIcon used for each chip
<!-- AC:END -->
