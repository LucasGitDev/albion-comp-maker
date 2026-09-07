---
id: ACM-034
title: >-
  CRÍTICO: clicar em 'Adicionar' nos slots de item não faz nada — não abre
  seletor de item
status: In Review
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 17:52'
labels: []
dependencies: []
priority: high
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Em /build/new, clicar no texto 'Adicionar' de qualquer slot (mão principal, cabeça, etc.) apenas aplica um outline verde de foco no card, sem abrir modal/dropdown/autocomplete de seleção de item. Isso quebra o fluxo principal do produto: o guild leader não consegue montar a comp. Testado em Chromium headless via Playwright, clique não dispara nenhuma UI de busca. Ação: implementar o picker de item (modal ou popover com busca/autocomplete) ao clicar em qualquer slot vazio ou preenchido.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Clicar em um slot vazio ('Adicionar') abre o ItemPicker daquele slot
- [ ] #2 Clicar em um slot preenchido (na área do ícone/nome, não no botão de limpar) reabre o ItemPicker com value = itemId atual
- [ ] #3 Selecionar um item no picker grava no slot correto do build-store e fecha o picker
- [ ] #4 Esc e clique fora fecham o picker sem alterar o slot
- [ ] #5 Slot offhand travado por arma de duas mãos NAO abre o picker
- [ ] #6 ACM-027 fica subsumida por esta task (mesma causa raiz: handleRequestItemPick era no-op)
- [ ] #7 Teste automatizado cobre: abrir picker por slot vazio, selecionar item, store atualizado, picker fechado
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: handleRequestItemPick in build/new/page.tsx was a deliberate no-op. Fixed by adding activeSlot state + new SlotPickerPopover modal shell wrapping the existing ACM-008 ItemPicker, plus a lazily-loaded useItemCatalogue hook (module-cached, non-literal import specifier so build doesn't break when src/data/ao-data.json is absent — gitignored/pipeline artifact, known cross-task gap per ACM-027 notes). SlotCard's filled state gained a dedicated clickable icon/name button (kept separate from the clear button) to reopen the picker with value=current itemId. offhandLocked is now threaded from the page into SlotGrid so the locked offhand never renders an interactive control. ACM-027 subsumed (identical root cause). Tests: src/__tests__/build-new-page.test.tsx, src/__tests__/slot-card-picker.test.tsx. make check green (lint/tsc/build/vitest 139 passing). PR #25.
<!-- SECTION:NOTES:END -->
