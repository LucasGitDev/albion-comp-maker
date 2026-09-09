---
id: ACM-113
title: 'Comp: adicionar rename e delete (ações inexistentes)'
status: To Do
assignee: []
created_date: '2026-09-09 17:38'
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
