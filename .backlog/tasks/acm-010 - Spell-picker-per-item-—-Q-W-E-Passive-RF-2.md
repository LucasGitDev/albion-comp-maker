---
id: ACM-010
title: Spell picker per item — Q/W/E/Passive (RF-2)
status: In Review
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 17:51'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
COLISAO DE MERGE (orchestrator): PR #23 (task/10-spell-picker) e a lane ACM-034/035 (task/34-wire-itempicker) modificam OS MESMOS arquivos: src/components/editor/SlotCard.tsx e src/app/(editor)/build/new/page.tsx. PR #23 esta MERGEABLE contra main hoje so porque a lane 034 ainda nao abriu PR. Quem mergear em segundo VAI conflitar. Ordem recomendada: ACM-034/035 primeiro (corrige fluxo principal quebrado do produto — clicar em slot nao abria o picker), depois rebase do #23 sobre main. O #23 refatora os chips de spell no SlotCard (-27/+17) e extrai spell-groups.ts; a lane 034 reescreve o mesmo componente para abrir o picker e trocar o icone de slot vazio. Nao mergear os dois sem rebase explicito.

CORRECAO DE STATUS (orchestrator): task estava marcada como Done com o PR #23 ainda ABERTO e nao mergeado. Isso viola a Definition of Done do CLAUDE.md (itens 5 e 6: branch mergeado via PR + make check verde na master DEPOIS do merge). Revertido para In Review ate o merge acontecer.
<!-- SECTION:NOTES:END -->
