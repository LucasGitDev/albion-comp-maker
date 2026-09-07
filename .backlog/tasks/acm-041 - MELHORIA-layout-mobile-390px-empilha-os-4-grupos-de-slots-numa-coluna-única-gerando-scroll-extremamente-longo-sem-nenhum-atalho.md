---
id: ACM-041
title: >-
  MELHORIA: layout mobile (390px) empilha os 4 grupos de slots numa coluna única
  gerando scroll extremamente longo sem nenhum atalho
status: In Progress
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 23:59'
labels: []
milestone: m-2
dependencies: []
priority: medium
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Em 390px, /build/new empilha Armas, Armadura, Utilidade e Consumíveis verticalmente em uma única coluna com 9 cards grandes, resultando em uma página de ~2200px de altura para rolar. Não há nenhum sumário fixo, tabs, ou accordion para navegar entre grupos, nem indicação de progresso (quantos slots já preenchidos). Ação: considerar tabs horizontais fixas por grupo em mobile, ou accordion colapsável, reduzindo a rolagem necessária para montar uma comp completa no celular.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
REVIEW PR #43 (task/41-mobile-slot-layout) — BLOCKED: 1 finding

HIGH — src/components/editor/SlotGroupNav.tsx:108 vs src/components/editor/EditorActionBar.tsx:151-153
Cenário de falha: viewport entre 640px e 767px (ex.: tablet retrato 700px, ou desktop com janela redimensionada). O contador da EditorActionBar usa `sm:inline` (visível a partir de 640px) enquanto o SlotGroupNav usa `md:hidden` (visível até 767px). Nessa faixa de 640-767px AMBOS os contadores ficam visíveis simultaneamente na mesma tela. Com um mainhand de duas mãos equipado (offhand locked), a EditorActionBar mostra "1/10" (usa SLOT_ORDER.length sem excluir o offhand travado — rastreado em ACM-065) e o SlotGroupNav mostra "1/9" (exclui o offhand travado) para o mesmíssimo estado de build, ao mesmo tempo, na mesma viewport. Dois números de progresso divergentes visíveis simultaneamente é uma regressão de UX perceptível, não apenas dívida documentada em comentário — o comentário em page.tsx reconhece a divergência de números mas não que os dois pontos ficam visíveis ao mesmo tempo numa faixa real de viewport.

Ação corretiva sugerida: alinhar os breakpoints (ambos `md:hidden`/`md:inline` ou ambos `sm:hidden`/`sm:inline`) para que nunca haja uma faixa de largura em que os dois contadores fiquem visíveis ao mesmo tempo — independente de quando ACM-065 alinhar os valores numéricos.

Resto do diff: SlotCard fluid width (w-full → md:w-[168px] fixo, não max-w), SlotGrid grid-cols-2 abaixo de md / flex-col preservado em md+, testes cobrindo contrato de largura, scroll-spy, foco e a11y do nav strip — sem outros problemas encontrados. `make check`/testes (370 testes, 48 arquivos) passam localmente. Nenhum arquivo fora do escopo esperado (SlotCard, SlotGrid, novo SlotGroupNav, types/build.ts, page.tsx, globals.css, testes).
<!-- SECTION:NOTES:END -->
