---
id: ACM-004
title: Implement localization indexer and ao-data.json emitter
status: Done
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 15:00'
labels: []
milestone: m-0
dependencies:
  - ACM-001
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
scripts/sync-ao-data.ts final steps: index localization (EN-US + PT-BR), filter items with name+slot, emit src/data/ao-data.json and ao-data.d.ts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ao-data.json has version field (ISO date of sync)
- [ ] #2 Items without localized name or without @slottype are discarded
- [ ] #3 Localization handles seg as string AND as object with #text
- [ ] #4 Output ~2000-2200 items and ~600-700 spells
- [ ] #5 ao-data.d.ts exports AOData, AOItem, AOSpell, Slot types
- [ ] #6 pnpm sync:ao script registered in package.json
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
sync-ao-data.ts complete: download + localize + resolve + emit ao-data.json. pnpm sync:ao script added. ao-data.d.ts types exported. tsx dev dep added. PR #4, make check green.
<!-- SECTION:FINAL_SUMMARY:END -->
