---
id: ACM-071
title: >-
  server-only-boundary test sinaliza import type-only como violacao
  (over-strict)
status: To Do
assignee: []
created_date: '2026-09-07 20:50'
updated_date: '2026-09-09 03:07'
labels: []
dependencies: []
priority: low
ordinal: 71000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da review da ACM-069 (PR #45). O novo src/__tests__/server-only-boundary.test.ts caminha o grafo de imports e sinaliza qualquer arquivo 'use client' que alcance um modulo com import 'server-only'. Mas o regex de import NAO distingue 'import type'. Consequencia: 'import type { BuildState } from "@/lib/build-schema"' num componente cliente e marcado como violacao, mesmo sendo APAGADO em build time, com exposicao real zero — o TypeScript remove o import inteiro, nada vai para o bundle. Nao e buraco de seguranca (o teste erra para o lado seguro), mas bloqueia trabalho legitimo: importar apenas o TIPO de um schema server-only e um padrao valido e util. O risco de um guard over-strict e que alguem eventualmente o desabilita, e ai ele para de proteger o caso real. Ensinar o walker a ignorar 'import type' e imports com especificadores 'type' inline. Documentar a regra no adendo da decision-013.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 import type de modulo server-only a partir de codigo cliente NAO e sinalizado
- [ ] #2 import de VALOR de modulo server-only a partir de codigo cliente continua sendo sinalizado
- [ ] #3 Especificador inline 'import { type X, y }' tratado corretamente: type ignorado, valor sinalizado
- [ ] #4 Regra documentada no adendo da decision-013
- [ ] #5 make check verde
<!-- AC:END -->
