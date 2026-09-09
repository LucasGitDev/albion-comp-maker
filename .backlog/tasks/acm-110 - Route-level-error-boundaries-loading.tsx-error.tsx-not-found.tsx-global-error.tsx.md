---
id: ACM-110
title: >-
  Route-level error boundaries: loading.tsx, error.tsx, not-found.tsx,
  global-error.tsx
status: To Do
assignee: []
created_date: '2026-09-09 17:37'
labels:
  - ui
  - ux
  - reliability
dependencies: []
priority: high
ordinal: 108000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nenhum arquivo loading.tsx, error.tsx, not-found.tsx ou global-error.tsx existe em src/app/. Quatro rotas chamam notFound() (sem not-found.tsx → 404 sem estilo, sem link de volta — dead end crítico para links compartilhados no Discord). Qualquer throw em render → tela branca sem recovery. /builds e /comps não têm skeleton de loading.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 src/app/not-found.tsx criado com EmptyState + link para /
- [ ] #2 src/app/error.tsx criado com mensagem de erro + botão reset()
- [ ] #3 src/app/global-error.tsx criado (fallback de último recurso)
- [ ] #4 src/app/builds/loading.tsx criado com skeleton compatível com BuildsListManager
- [ ] #5 src/app/comps/[id]/loading.tsx criado (4 chamadas paralelas em await Promise.all)
- [ ] #6 src/app/builds/page.tsx e comps/page.tsx substituem redirect("/") silencioso por ErrorRetry inline (igual ao padrão já existente em CompListErrorRetry)
<!-- AC:END -->
