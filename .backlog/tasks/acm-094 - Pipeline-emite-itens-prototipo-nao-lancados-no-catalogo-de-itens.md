---
id: ACM-094
title: Pipeline emite itens prototipo/nao-lancados no catalogo de itens
status: To Do
assignee: []
created_date: '2026-09-08 22:43'
labels:
  - bug
  - data-pipeline
dependencies: []
ordinal: 92000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Descoberto na review da ACM-091. O emitter de scripts/sync-ao-data.ts nao filtra conteudo nao-lancado: T8_HEAD_PLATE_PROTOTYPE, T8_ARMOR_PLATE_PROTOTYPE e T8_SHOES_PLATE_PROTOTYPE (set Dragonknight) entraram no ao-data.json. Sinais de prototipo confirmados pelo reviewer: spell literalmente chamado PROTOTYPE_ICESHIELD, e ausencia de localizacao PT-BR ao contrario de todos os outros itens de head. Consequencia: usuarios veem e podem selecionar itens que nao existem no jogo, gerando comps invalidas. Comportamento PRE-EXISTENTE do pipeline, nao introduzido pela ACM-091 — por isso nao bloqueou aquele merge. Investigar um criterio de exclusao robusto (nao apenas match no substring PROTOTYPE, que e fragil) e decidir se a ausencia de PT-BR e um sinal utilizavel.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Itens prototipo/nao-lancados nao aparecem no catalogo do item-picker
- [ ] #2 Criterio de exclusao documentado e nao baseado apenas em substring de uniquename
- [ ] #3 Teste no scripts/sync-ao-data.test.ts cobre a exclusao
- [ ] #4 make check verde
<!-- AC:END -->
