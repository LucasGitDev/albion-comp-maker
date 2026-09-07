---
id: ACM-025
title: Fix item-spell resolution against restructured ao-bin-dumps items.json schema
status: In Progress
assignee: []
created_date: '2026-09-07 15:56'
updated_date: '2026-09-07 16:13'
labels: []
dependencies: []
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
formatted/items.json upstream now splits items by type (equipmentitem/weapon/mount/etc) with nested craftingspelllist objects instead of a flat {items:{item:[...]}} array with @slottype/craftingspells attributes. src/lib/spell-resolver.ts buildItemIndex/resolveSpells need to be adapted. Discovered while working ACM-024 (pipeline now emits 0 items, 9044 spells).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm sync:ao --force exits 0 and the emitted ao-data.json contains more than 1000 items
- [ ] #2 Items are indexed with a normalized slot type (mainhand/offhand/head/armor/shoes) derived from the new nested schema
- [ ] #3 A known weapon (e.g. T4_MAIN_FIRESTAFF) resolves a non-empty set of Q/W/E spell options through resolveSpells
- [ ] #4 Unit tests cover buildItemIndex against a fixture of the new nested items.json schema
- [ ] #5 make check exits 0
- [ ] #6 T8_ARMOR_PLATE_SET1 yields passives in BOTH slot group 1 and group 2 (guards the @slots-as-group-index inference)
- [ ] #7 sync fails loudly (non-zero exit) if items < 1500 or if no passive spells are emitted
<!-- AC:END -->
