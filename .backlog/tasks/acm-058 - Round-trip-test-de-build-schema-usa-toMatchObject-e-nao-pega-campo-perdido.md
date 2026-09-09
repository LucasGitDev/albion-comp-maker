---
id: ACM-058
title: Round-trip test de build-schema usa toMatchObject e nao pega campo perdido
status: In Progress
assignee: []
created_date: '2026-09-07 19:48'
updated_date: '2026-09-09 03:25'
labels: []
dependencies: []
priority: low
ordinal: 58000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado LOW da review final da ACM-031 (PR #34). O teste de round-trip em src/__tests__/build-schema.test.ts (payload legado -> parseBuildContent -> validateBuildContentForWrite) usa toMatchObject, que so verifica que as chaves esperadas existem com os valores esperados — NAO falha se o round-trip PERDER um campo nao mencionado na assercao. O reviewer verificou manualmente com toEqual que o round-trip esta correto hoje, entao nao ha bug agora; o problema e que o teste nao protege contra regressao futura de perda de campo, que e exatamente o risco de ter dois schemas (leitura e escrita) que podem divergir. Trocar por toEqual.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Teste de round-trip usa toEqual (ou equivalente estrito) em vez de toMatchObject
- [ ] #2 O teste falha se qualquer campo do payload for perdido no round-trip leitura->escrita
- [ ] #3 make check verde
<!-- AC:END -->
