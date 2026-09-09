---
id: ACM-105
title: Elevar branch coverage para ≥85%
status: In Progress
assignee: []
created_date: '2026-09-09 14:55'
updated_date: '2026-09-09 14:55'
labels:
  - quality
  - testing
dependencies:
  - ACM-104
priority: high
ordinal: 103000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Branch coverage atual: ~81%. Meta: ≥85% (caminho para fase 2 do quality gate com threshold de 90%).

Contexto do quality gate (ACM-104):
- Threshold atual bloqueante: 80% (fase 1)
- Threshold fase 2: 90%
- Coverage provider: @vitest/coverage-v8, reporter lcov
- Exclusões ativas: src/auth/**, src/**/*.test.*, src/**/*.spec.*

Arquivos com branch coverage mais baixo (baseline do CI, run ACM-104):
- src/app/api/background/route.ts — 68.18% branches (linhas: 40,47,64,74,84)
- src/app/api/background/[id]/route.ts — 64.28% branches (linhas: 48-50,72-75)
- src/app/api/icon/route.ts — 73.91% branches (linhas: 19,44,49,61,72)
- src/actions/builds.ts — 87.17% branches (linhas: 91-92)
- src/app/api/items/route.ts — 94.44% branches (linha: 90)
- src/lib/slow-limiter.ts — 68.42% branches (linhas: 52-56,69)
- src/lib/commit-policy.ts — 75% branches (linhas: 58-67)
- src/store/build-store.ts — 85.29% branches (linha: 124)

Verificar com: pnpm exec vitest run --coverage 2>&1 | grep -E 'All files|branches'
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm exec vitest run --coverage reporta branch coverage ≥85% no summary 'All files'
- [ ] #2 make check passa com exit 0
- [ ] #3 nenhum teste novo usa mock vazio sem comportamento real
- [ ] #4 nenhum código de produção modificado — apenas arquivos de teste
<!-- AC:END -->
