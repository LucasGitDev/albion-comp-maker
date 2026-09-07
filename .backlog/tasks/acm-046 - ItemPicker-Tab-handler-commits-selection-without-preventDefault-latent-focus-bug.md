---
id: ACM-046
title: >-
  ItemPicker Tab handler commits selection without preventDefault (latent focus
  bug)
status: Done
assignee: []
created_date: '2026-09-07 18:43'
updated_date: '2026-09-07 18:56'
labels: []
dependencies: []
priority: medium
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Causa raiz encontrada na investigacao do PR #25. src/components/item-picker/ItemPicker.tsx trata a tecla Tab para confirmar o resultado destacado, mas NUNCA chama preventDefault(). Consequencia: o Tab confirma o item, fecha o modal (o fundo perde inert) e o Tab nativo — nao prevenido — leva o foco para o proximo elemento do DOM, escapando do dialog. O bug ficou MASCARADO enquanto o catalogo estava sempre vazio (sem resultados = sem item destacado = handler silencioso); so apareceu quando ACM-043 fez /api/items funcionar de verdade. Mitigado no PR #25 por fora, em SlotPickerPopover.tsx, usando onKeyDownCapture + stopPropagation, porque item-picker/** pertence a outra lane. Essa mitigacao e um contorno: qualquer outro consumidor do ItemPicker continua exposto. Corrigir na origem.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ItemPicker chama preventDefault() ao confirmar selecao via Tab, para o Tab nativo nao propagar
- [ ] #2 Nenhum consumidor do ItemPicker perde o foco para fora do container ao confirmar com Tab
- [ ] #3 O contorno onKeyDownCapture/stopPropagation em SlotPickerPopover pode ser removido sem quebrar o focus trap
- [ ] #4 Teste de regressao cobre Tab com resultado destacado, sem depender de catalogo vazio
- [ ] #5 make check verde
<!-- AC:END -->
