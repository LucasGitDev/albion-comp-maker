---
id: ACM-045
title: Picker at 390px should use a full-screen dialog treatment
status: To Do
assignee: []
created_date: '2026-09-07 18:33'
labels: []
dependencies: []
priority: low
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verificado em browser real (review do PR #25): a 390px o SlotPickerPopover mantem o formato de dropdown ancorado do desktop — posicionado junto ao botao que o abriu, nomes longos truncados (ex: 'T8_2H_ARCANE_RINGPAIR...'), e o backdrop escurece apenas parte da altura da viewport em vez da pagina toda. O fluxo funciona ponta a ponta e nada quebra; e lacuna de polimento, nao bloqueio. Acao: em telas estreitas, tratar o picker como dialog full-screen (ou bottom sheet) com backdrop cobrindo toda a viewport e espaco suficiente para nomes de item completos.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Em <=430px o picker ocupa a tela toda (ou bottom sheet) com backdrop cobrindo a viewport inteira
- [ ] #2 Nomes de item nao truncam no mobile
- [ ] #3 Layout desktop inalterado
- [ ] #4 make check verde
<!-- AC:END -->
