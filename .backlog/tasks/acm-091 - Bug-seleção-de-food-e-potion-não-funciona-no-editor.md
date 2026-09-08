---
id: ACM-091
title: 'Bug: seleção de food e potion não funciona no editor'
status: To Do
assignee: []
created_date: '2026-09-08 14:49'
updated_date: '2026-09-08 14:53'
labels: []
milestone: m-2
dependencies: []
priority: high
ordinal: 89000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ItemPicker abre para slots de food e potion, mas não retorna resultados. O filtro de tipo (food/potion/consumable) está descartando todos os itens do catálogo. Deve funcionar igual à seleção de arma/armadura: busca por nome, resultados com ícone, seleciona e aparece no slot.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Busca por nome retorna resultados de poções ao abrir slot de potion|Busca por nome retorna resultados de comida ao abrir slot de food|Seleção funciona igual aos slots de equipamento|Ícone correto aparece no slot após seleção
<!-- AC:END -->
