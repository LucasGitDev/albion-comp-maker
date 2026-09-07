---
id: ACM-003
title: Implement spell resolver algorithm (Section 3)
status: To Do
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 13:32'
labels: []
milestone: m-0
dependencies:
  - ACM-001
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Core algorithm: resolve inherited spell lists per item via craftingspelllist reference chain. Must handle toArray normalization, cycle detection, removespell, multi-level inheritance.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 resolve(T8_2H_HAMMER_UNDEAD) returns artifact-exclusive spells and excludes removed base spells
- [ ] #2 resolve(T4_MAIN_HAMMER) returns HAMMER_SHOVE slot-1, HAMMERWHIRLWIND2 slot-3, PASSIVE_STUNCHANCE passiva
- [ ] #3 Every equipment item has >= 1 active OR passive (bag/cape exceptions logged not thrown)
- [ ] #4 No resolved spell references an ID absent from spells.json
- [ ] #5 Cycle detection: circular @reference does not hang
<!-- AC:END -->
