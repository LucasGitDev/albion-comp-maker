---
id: ACM-087
title: Teste de regressao de precedencia na fallback chain de localizacao de spells
status: To Do
assignee: []
created_date: '2026-09-08 13:42'
labels: []
dependencies: []
ordinal: 85000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finding MEDIUM da review da ACM-079 (PR #53).

A review confirmou por leitura de scripts/sync-ao-data.ts:105-130 que o match exato retorna ANTES de qualquer fallback ser tentado, e que nenhuma das 39/48 entradas amostradas colide com um match exato proprio. Ou seja, hoje esta correto.

O que falta e o teste que TRAVA esse comportamento. A fallback chain (exact -> strip de sufixo de arma -> scan de tier -> humanize) e exatamente o tipo de codigo onde alguem reordena os ramos numa refatoracao futura e nada quebra visivelmente: o pipeline continua gerando nomes, so que errados — uma passiva que hoje tem traducao exata passaria a exibir o nome generico da familia. Falha silenciosa, so detectavel por inspecao visual da UI.

Adicionar teste explicito: um spell com traducao exata E que tambem casaria com um ramo de fallback deve resolver pelo exato.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Existe teste que falha se a ordem dos ramos da chain for alterada
- [ ] #2 O teste usa um spell que casaria com mais de um ramo, provando precedencia e nao apenas resolucao
- [ ] #3 make check verde
<!-- AC:END -->
