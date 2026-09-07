---
id: ACM-035
title: >-
  CRÍTICO: ícones dos itens não carregam — todos os slots mostram ícone de erro
  (!) com borda vermelha
status: In Progress
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 17:42'
labels: []
dependencies: []
priority: high
ordinal: 35000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Todos os slots de equipamento em /build/new exibem um placeholder de imagem quebrada (ícone de exclamação com borda tracejada vermelha), inclusive antes de qualquer seleção. O diferencial do produto é usar ícones oficiais do jogo (ver CLAUDE.md: 'Uses official game icons'). Sem isso a interface parece quebrada, não 'vazia'. Ação: verificar path/CDN dos ícones dos slots vazios (placeholder de categoria: espada, elmo, etc. — não deveria ser um ícone de erro) e garantir fallback visual apropriado (ex: silhueta cinza da categoria do slot) quando não há item selecionado.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Slot vazio NAO renderiza ItemIcon com itemId="" — usa placeholder de silhueta da categoria do slot
- [ ] #2 Nenhum slot vazio exibe o glifo de erro '!' nem borda vermelha antes de qualquer selecao
- [ ] #3 Slot preenchido continua carregando o icone oficial via /api/icon
- [ ] #4 Teste automatizado assegura que slot vazio nao renderiza estado de erro
<!-- AC:END -->
