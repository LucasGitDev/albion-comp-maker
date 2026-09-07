---
id: ACM-041
title: >-
  MELHORIA: layout mobile (390px) empilha os 4 grupos de slots numa coluna única
  gerando scroll extremamente longo sem nenhum atalho
status: In Progress
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 20:27'
labels: []
dependencies: []
priority: medium
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Em 390px, /build/new empilha Armas, Armadura, Utilidade e Consumíveis verticalmente em uma única coluna com 9 cards grandes, resultando em uma página de ~2200px de altura para rolar. Não há nenhum sumário fixo, tabs, ou accordion para navegar entre grupos, nem indicação de progresso (quantos slots já preenchidos). Ação: considerar tabs horizontais fixas por grupo em mobile, ou accordion colapsável, reduzindo a rolagem necessária para montar uma comp completa no celular.
<!-- SECTION:DESCRIPTION:END -->
