---
id: ACM-055
title: >-
  Exact<> anti-drift nao falha tsc quando campo OPCIONAL e adicionado a
  BuildState
status: In Progress
assignee: []
created_date: '2026-09-07 19:26'
updated_date: '2026-09-09 03:25'
labels: []
dependencies: []
priority: low
ordinal: 55000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da review da ACM-049 (PR #33), verificado empiricamente pelo reviewer injetando drift. src/lib/build-schema.ts:79-81 tem uma assercao de tipo Exact<z.infer<typeof buildStateSchema>, BuildState> que deveria quebrar 'tsc --noEmit' se o schema Zod e o tipo BuildState divergirem. Ela funciona para campos obrigatorios, mas NAO dispara quando um campo OPCIONAL e adicionado a BuildState — a nota de implementacao afirma protecao total, o que e falso. Impacto real e limitado: o .strictObject() em runtime ainda rejeita a chave desconhecida, entao nao ha risco de integridade de dados; o problema e que a garantia de CI anunciada nao existe, e alguem vai confiar nela. Ou corrigir o helper Exact<> para capturar opcionais, ou corrigir a documentacao para descrever o que ele realmente cobre.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Exact<> falha tsc quando um campo opcional e adicionado a BuildState sem o correspondente no schema, OU a nota de implementacao e corrigida para descrever a cobertura real
- [ ] #2 Teste ou check de CI que prove a direcao escolhida
- [ ] #3 make check verde
<!-- AC:END -->
