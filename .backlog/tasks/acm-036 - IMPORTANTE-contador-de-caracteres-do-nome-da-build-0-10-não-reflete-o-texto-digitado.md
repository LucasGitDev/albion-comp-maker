---
id: ACM-036
title: >-
  IMPORTANTE: contador de caracteres do nome da build (0/10) não reflete o texto
  digitado
status: Done
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 20:47'
labels: []
milestone: m-1
dependencies: []
priority: low
ordinal: 36000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Testado preenchendo o campo 'Nome do build' com 80 caracteres ('A' repetido); o input aceitou todo o texto sem truncar e o contador ao lado continuou mostrando '0/10' — não atualiza, não bloqueia excesso, e o número 10 é baixíssimo para nome de comp (nomes reais como 'Dragon Raid Meele Comp' já têm mais de 10 caracteres). O texto também estoura visualmente a largura fixa do input sem quebra de linha nem reticências. Ação: (1) corrigir o binding do contador para refletir o valor real do input, (2) rever o limite (sugestão: 40-60 chars, alinhado ao que comps reais usam), (3) aplicar text-overflow: ellipsis ou truncamento com título completo em tooltip.
<!-- SECTION:DESCRIPTION:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-09-07 17:42
---
MISDIAGNÓSTICO (verificado no código, orchestrator): o '0/10' NÃO é contador de caracteres do nome. BuildHeader.tsx:13 calcula filledCount = SLOT_ORDER.filter(slot => build.slots[slot] !== null).length e a linha 44 renderiza {filledCount}/{SLOT_ORDER.length}. São 10 slots de equipamento, logo '0/10' está CORRETO e reage a slots preenchidos, não a texto. Não existe contador de caracteres nem maxLength no input de nome (BuildHeader.tsx:21-27). Não há bug de binding. O problema real é apenas ambiguidade: o número aparece sem rótulo ao lado do input de nome, induzindo à leitura de 'limite de caracteres'. Escopo reduzido para: rotular o contador (ex: 'X/10 slots') e dar-lhe data-testid semântico. Reclassificar prioridade High -> Low.
---
<!-- COMMENTS:END -->
