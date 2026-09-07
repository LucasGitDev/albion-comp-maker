---
id: ACM-005
title: Write Phase 1 acceptance tests (4 mandatory cases)
status: To Do
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 15:47'
labels: []
milestone: m-0
dependencies:
  - ACM-002
  - ACM-003
  - ACM-004
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Vitest tests covering the 4 acceptance cases from PRD Section 3. Must pass before Phase 2 starts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Test 1: T8_2H_HAMMER_UNDEAD spell chain resolves correctly (artifact spells present, removed base spells absent)
- [ ] #2 Test 2: T4_MAIN_HAMMER resolves HAMMER_SHOVE slot-1, HAMMERWHIRLWIND2 slot-3, PASSIVE_STUNCHANCE passive
- [ ] #3 Test 3: all equipment items in ao-data.json have >= 1 active or passive
- [ ] #4 Test 4: no resolved spell id is absent from spells.json
- [ ] #5 pnpm test exits 0 with all 4 tests green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
BLOQUEADO: upstream ao-bin-dumps removeu formatted/spells.json e formatted/localization.json (404). sync-ao-data.ts não consegue gerar ao-data.json. AC-3 e AC-4 não podem rodar contra dados reais. Precisa corrigir ACM-002 (sync script) antes de retomar.
<!-- SECTION:NOTES:END -->
