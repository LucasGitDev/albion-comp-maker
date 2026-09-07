---
id: ACM-060
title: setSwapLabel coage label vazio para um espaco em branco
status: Done
assignee: []
created_date: '2026-09-07 20:01'
updated_date: '2026-09-07 20:21'
labels: []
dependencies: []
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado LOW da review da ACM-012 (PR #37). src/store/build-store.ts setSwapLabel armazena silenciosamente um unico espaco ' ' quando o usuario limpa o campo de label, para satisfazer swapSchema.label.min(1) em src/lib/build-schema.ts. Isso contradiz a propria spec de UX da task (label vazio permitido) e persiste um valor sujo: o usuario ve o campo vazio, mas o dado salvo contem ' '. Hoje e cosmetico porque swaps ainda nao renderizam no card de export (#capture-root), mas vira visivel quando renderizarem, e ja e um dado errado no banco. Corrigir na origem: ou permitir label vazio no schema (.min(0) / opcional) ou nao persistir a chave quando vazia — nao coagir para espaco.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Limpar o campo de label nao persiste ' ' — ou o label fica ausente/vazio de verdade
- [ ] #2 Schema e store concordam sobre o que e um label vazio valido
- [ ] #3 Teste cobrindo limpar um label previamente preenchido
- [ ] #4 make check verde
<!-- AC:END -->
