---
id: ACM-064
title: Mover checagem de isPublic para o WHERE do SQL nas leituras publicas
status: In Progress
assignee: []
created_date: '2026-09-07 20:30'
updated_date: '2026-09-09 03:10'
labels: []
dependencies: []
priority: high
ordinal: 64000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado LOW/defesa-em-profundidade da auditoria de seguranca da ACM-021 (PR #41). Em src/lib/public-content.ts a checagem de isPublic acontece em JS DEPOIS do fetch, nao na clausula WHERE do SQL. Funcionalmente correto hoje — a linha e descartada imediatamente e nada vaza, o auditor confirmou. Mas diverge do padrao estabelecido nas mutations (ACM-018/019), onde o predicado de ownership vive no WHERE real justamente para que um refactor futuro nao consiga esquecer o filtro. Um filtro pos-fetch e uma linha de codigo removivel; um WHERE e estrutural. Alinhar ao padrao do resto do codebase.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 isPublic faz parte do WHERE da query, nao de um filtro pos-fetch em JS
- [ ] #2 Comportamento inalterado: privado/inexistente continuam indistinguiveis (null -> notFound)
- [ ] #3 Testes existentes continuam verdes
- [ ] #4 make check verde
<!-- AC:END -->
