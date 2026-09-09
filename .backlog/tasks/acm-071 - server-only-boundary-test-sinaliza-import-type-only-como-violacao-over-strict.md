---
id: ACM-071
title: >-
  server-only-boundary test sinaliza import type-only como violacao
  (over-strict)
status: Done
assignee: []
created_date: '2026-09-07 20:50'
updated_date: '2026-09-09 14:22'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
PR opened: #76

Review PR #76: LGTM.

Verificação manual (node) dos casos do regex/isTypeOnlyImport, todos corretos:
- import type { X } from '...' -> ignorado (AC #1)
- export type { X } from '...' -> ignorado (AC #1)
- import { type X, y } from '...' (type primeiro ou depois) -> flagado (AC #3, y é valor real)
- import { type A, type B } from '...' -> ignorado (todo especificador é type)
- import X from '...' / import * as ns from '...' / import 'side-effect' -> sempre flagado (default/namespace/side-effect são sempre valor)
- import Default, { type X } from '...' -> flagado (Default é valor real, correto)

Suite roda verde: 2/2 testes passam (server-only-boundary.test.ts), sem regressão (AC não numerado 'testes existentes não regridem').
Adendo na decision-013 documenta a regra (AC #4).

Gap MEDIUM (não bloqueante): não há teste unitário direto para extractImportSpecifiers/isTypeOnlyImport cobrindo os casos type-only e misto do AC #1/#3 — a única cobertura é o teste de integração que varre os arquivos reais de src/, e hoje não existe nenhum 'import type' de módulo server-only no código real (grep confirma). Ou seja, a regra fica sem pino de regressão automatizado; se alguém quebrar isTypeOnlyImport no futuro, só será pego quando/e apenas quando aparecer um import type real de módulo server-only em algum client component. Sugiro (não bloqueante) task de follow-up para adicionar 2-3 casos unitários (fixture strings) fixando o comportamento.
<!-- SECTION:NOTES:END -->
