---
id: ACM-110
title: >-
  Route-level error boundaries: loading.tsx, error.tsx, not-found.tsx,
  global-error.tsx
status: Done
assignee: []
created_date: '2026-09-09 17:37'
updated_date: '2026-09-09 18:20'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Reviewer: PR #87 diff checked against all 6 ACs (verified via gh pr diff 87, not local checkout since main worktree is on main). AC1 not-found.tsx uses Empty/EmptyHeader/EmptyTitle/EmptyDescription + link to /. AC2 error.tsx is "use client", renders error.message + reset() button. AC3 global-error.tsx is "use client", wraps own <html><body>, deliberately free of app deps/theme vars per its own doc comment - correct given it replaces root layout. AC4 builds/loading.tsx mirrors BuildsListManager item shape (name/role line + action buttons). AC5 comps/[id]/loading.tsx mirrors title + list + share-status sections. AC6 both builds/page.tsx and comps/page.tsx replace redirect("/") with inline ErrorRetry (BuildsListErrorRetry new, reuses existing CompListErrorRetry) wired to router.refresh(). Confirmed no redirect("/") calls remain in the diff except inside a code comment. No scope creep, no missing 'use client', no CRITICAL/HIGH findings. Verdict: LGTM.
<!-- SECTION:NOTES:END -->
