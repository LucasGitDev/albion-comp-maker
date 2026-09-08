---
id: ACM-039
title: >-
  Editor: cor de categoria por slot via tokens do design system
  (arma/armadura/utilidade/consumível)
status: To Do
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-08 00:08'
labels: []
milestone: m-3
dependencies:
  - ACM-041
priority: medium
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Escopo reduzido: esta task agora cobre APENAS o reforço visual de categoria por cor. A redução de densidade do card (ícone + nome lado a lado) foi fatiada para a ACM-075, porque mexe em layout e conflita com o grid 2-up mobile da ACM-041.

Situação atual (evidência):
- src/components/editor/SlotCard.tsx:68-79 já existe o mapa SLOT_CATEGORY: Record<Slot, SlotCategory> com weapon/armor/utility/consumable. A categoria JÁ é conhecida em runtime — falta apenas expressá-la em cor.
- src/components/editor/SlotCard.tsx:154 e :193 já usam essa categoria para escolher a silhueta (CATEGORY_GLYPH_PATH em src/components/icons/category-glyphs.tsx:9), ou seja, o eixo 'ícone por categoria' do título original JÁ ESTÁ FEITO.
- src/components/editor/SlotCard.tsx:165 o card preenchido usa border-icon-slot-empty — a mesma borda para as quatro categorias. É o ponto único de mudança.
- src/components/editor/SlotGrid.tsx:57-62 o título do grupo usa text-icon-muted uniforme para os 4 grupos.
- src/types/build.ts:65-70 SLOT_COLUMNS define os 4 grupos (armas/armadura/utilidade/consumiveis) e alinha 1:1 com SLOT_CATEGORY — nenhuma taxonomia nova precisa ser inventada.

NÃO duplicar o agrupamento existente: o SlotGroupNav (ACM-041) já é a navegação por grupo; esta task só colore, não reorganiza nem cria nova navegação.

Restrição de dívida técnica: as cores nascem como tokens nomeados, nunca hardcoded — mesma política da ACM-048.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Quatro tokens nomeados de categoria são criados em src/app/globals.css no mesmo bloco dos tokens existentes (padrão --color-slot-category-weapon | -armor | -utility | -consumable) e expostos ao Tailwind como os demais --color-*
- [ ] #2 Nenhum hex cru de cor de categoria aparece em src/components/editor/ — SlotCard e SlotGrid referenciam somente os tokens novos ou tokens já existentes
- [ ] #3 O card de slot preenchido usa a cor da categoria em uma única affordance sutil (borda ou faixa lateral), derivada de SLOT_CATEGORY[slot]; os 4 slots de categorias diferentes produzem 4 valores de cor distintos no DOM
- [ ] #4 O card de slot VAZIO também recebe a mesma cor de categoria, em intensidade reduzida, para que a categoria seja legível antes de qualquer item ser equipado
- [ ] #5 O título de cada grupo no SlotGrid usa a cor da sua categoria, mantendo contraste >= 4.5:1 contra --color-surface
- [ ] #6 A cor NÃO é o único canal de informação: o rótulo textual do slot e a silhueta por categoria (CATEGORY_GLYPH_PATH) permanecem visíveis, garantindo leitura para daltônicos
- [ ] #7 Nenhuma mudança de dimensão: largura md:w-[168px], size-24 do ícone e paddings do SlotCard permanecem idênticos (densidade é escopo da ACM-075)
- [ ] #8 Teste automatizado que renderiza slots das 4 categorias e afirma que cada um expõe seu marcador de categoria (ex.: atributo data-slot-category) com os 4 valores distintos
- [ ] #9 make check verde
<!-- AC:END -->
