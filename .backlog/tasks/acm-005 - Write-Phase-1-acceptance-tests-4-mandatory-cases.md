---
id: ACM-005
title: Write Phase 1 acceptance tests (4 mandatory cases)
status: In Progress
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 16:30'
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
- [ ] #3 Test 4: no resolved spell id is absent from spells.json
- [ ] #4 pnpm test exits 0 with all 4 tests green
- [ ] #5 Per-slot spell coverage invariant holds against the committed real corpus (replaces the original 'every item has >=1 spell', which decision-005 disproved: 584 of 2036 items legitimately have @activespellslots=0 and @passivespellslots=0 — vanity gear, gathering tools, plain capes/shields, base mounts, and ALL 112 offhands)
- [ ] #6 AC-1 also asserts HAMMERTACKLE IS present on base T8_2H_HAMMER, so the 'removed spell absent' half cannot pass vacuously
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
BLOQUEADO: upstream ao-bin-dumps removeu formatted/spells.json e formatted/localization.json (404). sync-ao-data.ts não consegue gerar ao-data.json. AC-3 e AC-4 não podem rodar contra dados reais. Precisa corrigir ACM-002 (sync script) antes de retomar.

DESBLOQUEADO por ACM-025. Pipeline emite 2036 items / 9044 spells. Branch task/5-phase1-tests e PR #5 descartados: foram escritos contra schema presumido que decision-004 refutou. Reimplementar do zero a partir de main.

decision-005: testes rodam contra corpus real podado (0.54MB, 21KB gzip) importado estaticamente — sem existsSync/skipIf, arquivo ausente = falha de compilacao, nunca verde vago. AC-3 original era factualmente falso. Descoberta de produto: TODOS os 112 offhands tem zero spell slots — o editor nao deve renderizar Q/W/E para offhand. Atencao: slotGroup e string ('1','3'), nao number.
<!-- SECTION:NOTES:END -->
