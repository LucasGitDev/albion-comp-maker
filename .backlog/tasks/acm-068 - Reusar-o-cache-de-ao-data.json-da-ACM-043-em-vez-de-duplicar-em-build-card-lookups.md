---
id: ACM-068
title: >-
  Reusar o cache de ao-data.json da ACM-043 em vez de duplicar em
  build-card-lookups
status: To Do
assignee: []
created_date: '2026-09-07 20:32'
updated_date: '2026-09-07 20:42'
labels: []
milestone: m-7
dependencies: []
ordinal: 68000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da review da ACM-021 (PR #41). src/lib/build-card-lookups.ts implementa sua propria leitura e cache de ao-data.json, duplicando o padrao que a ACM-043 ja estabeleceu em src/app/api/items/route.ts (cache em escopo de modulo, payload enxuto, ETag, estado explicito quando o artefato nao existe). Duas copias da mesma logica de cache divergem: uma pode ganhar invalidacao ou tratamento de arquivo ausente que a outra nao tem, e a ACM-043 tem um criterio explicito de tempo de carga. Extrair um unico modulo de acesso ao catalogo consumido pelos dois.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Uma unica implementacao de leitura/cache de ao-data.json consumida pela rota /api/items e pelas paginas SSR
- [ ] #2 Comportamento de artefato ausente identico nos dois consumidores (sem 500 com stack)
- [ ] #3 Sem regressao no criterio de tempo de carga da ACM-043
- [ ] #4 make check verde
<!-- AC:END -->
