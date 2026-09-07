---
id: ACM-026
title: Emit twohanded flag on AOItem
status: Done
assignee: []
created_date: '2026-09-07 16:30'
updated_date: '2026-09-07 16:35'
labels: []
dependencies: []
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
decision-004 specified carrying twohanded: item['@twohanded']==='true' into the emitted item, but scripts/sync-ao-data.ts never implemented it and AOItem in src/data/ao-data.d.ts lacks the field. Caught by the ACM-008 uiux spec: the offhand-lock rule (selecting a 2H mainhand must clear/lock the offhand) cannot be implemented without it. The /_2H_/ id heuristic is a naming convention, not a contract, and must not be relied on.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AOItem type in src/data/ao-data.d.ts has a boolean twohanded field
- [ ] #2 sync-ao-data.ts emits twohanded from the upstream @twohanded attribute
- [ ] #3 T8_2H_WARBOW emits twohanded true and T8_MAIN_FIRESTAFF emits twohanded false, asserted by a unit test
- [ ] #4 make check exits 0
<!-- AC:END -->
