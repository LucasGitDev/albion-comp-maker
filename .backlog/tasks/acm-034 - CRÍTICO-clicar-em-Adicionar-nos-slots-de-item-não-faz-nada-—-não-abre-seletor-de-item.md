---
id: ACM-034
title: >-
  CRÍTICO: clicar em 'Adicionar' nos slots de item não faz nada — não abre
  seletor de item
status: To Do
assignee: []
created_date: '2026-09-07 17:36'
labels: []
dependencies: []
priority: high
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Em /build/new, clicar no texto 'Adicionar' de qualquer slot (mão principal, cabeça, etc.) apenas aplica um outline verde de foco no card, sem abrir modal/dropdown/autocomplete de seleção de item. Isso quebra o fluxo principal do produto: o guild leader não consegue montar a comp. Testado em Chromium headless via Playwright, clique não dispara nenhuma UI de busca. Ação: implementar o picker de item (modal ou popover com busca/autocomplete) ao clicar em qualquer slot vazio ou preenchido.
<!-- SECTION:DESCRIPTION:END -->
