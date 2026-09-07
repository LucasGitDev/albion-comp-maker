---
id: ACM-036
title: >-
  IMPORTANTE: contador de caracteres do nome da build (0/10) não reflete o texto
  digitado
status: To Do
assignee: []
created_date: '2026-09-07 17:36'
labels: []
dependencies: []
priority: high
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Testado preenchendo o campo 'Nome do build' com 80 caracteres ('A' repetido); o input aceitou todo o texto sem truncar e o contador ao lado continuou mostrando '0/10' — não atualiza, não bloqueia excesso, e o número 10 é baixíssimo para nome de comp (nomes reais como 'Dragon Raid Meele Comp' já têm mais de 10 caracteres). O texto também estoura visualmente a largura fixa do input sem quebra de linha nem reticências. Ação: (1) corrigir o binding do contador para refletir o valor real do input, (2) rever o limite (sugestão: 40-60 chars, alinhado ao que comps reais usam), (3) aplicar text-overflow: ellipsis ou truncamento com título completo em tooltip.
<!-- SECTION:DESCRIPTION:END -->
