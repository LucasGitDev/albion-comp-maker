---
id: ACM-091
title: 'Bug: seleção de food e potion não funciona no editor'
status: In Progress
assignee: []
created_date: '2026-09-08 14:49'
updated_date: '2026-09-08 22:08'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
ROOT CAUSE (orchestrator, verificado): nao e filtro de slotType na UI. ao-data.json nao contem NENHUM item de food ou potion. Contagem por slot no artefato atual: mainhand 817, head 280, armor 264, shoes 256, cape 196, offhand 111, mount 100, bag 12 — food 0, potion 0. O index.bySlot.get('food') retorna undefined -> [] em src/lib/item-index.ts:168, por isso zero resultados. A correcao pertence ao pipeline de dados (classificacao/emissao de consumiveis), nao ao ItemPicker. Escopo muda para scripts de download/emissao + regeneracao do ao-data.json.
<!-- SECTION:NOTES:END -->
