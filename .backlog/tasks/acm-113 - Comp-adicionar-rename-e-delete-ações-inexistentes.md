---
id: ACM-113
title: 'Comp: adicionar rename e delete (ações inexistentes)'
status: In Progress
assignee: []
created_date: '2026-09-09 17:38'
updated_date: '2026-09-09 18:32'
labels:
  - comp
  - crud
  - ux
dependencies: []
priority: high
ordinal: 111000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Não existe server action updateComp (rename) nem deleteComp. Uma vez criada, comp não pode ser renomeada nem excluída. Guilds renomeiam comps frequentemente conforme meta muda. Auditoria product-spec de 2026-09-09. Rotas impactadas: /comps/[id] (inline edit do h1), /comps (botão excluir por linha).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Server action updateComp(id, { name }) existe com requireSession + ownership check
- [ ] #2 Server action deleteComp(id) existe com cascade de comp_builds
- [ ] #3 h1 em /comps/[id] é editável inline (ou modal) — salva via updateComp
- [ ] #4 Botão Excluir em /comps/[id] abre dialog de confirmação e chama deleteComp; redireciona para / após
- [ ] #5 Botão Excluir em /comps (lista) disponível por linha
- [ ] #6 make check passa
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reviewer pass 2: LGTM. Verified commit 285ab8c: (1) CompHeader.tsx display state now renders <h1 tabIndex={0}> (confirmed via screen.getByRole('heading', {level:1})) — MEDIUM resolved. (2) 3 test files added (comp-header.test.tsx, comps-list-manager.test.tsx, delete-comp-dialog.test.tsx) covering rename success (updateComp called with new name), rename rollback on failure (name reverts + toast.error), delete confirm flow (deleteComp called + redirect/row removal), delete failure (row kept + toast.error), and dialog focus/Escape/pending-disable — HIGH resolved. Ran tests directly: 11/11 pass. Ran full make check on branch: lint, tsc, build, and full suite (91 files / 861 tests) all pass. AC#1/#2 (server actions) untouched by this PR, no regression. All 6 ACs hold. No new findings.
<!-- SECTION:NOTES:END -->
