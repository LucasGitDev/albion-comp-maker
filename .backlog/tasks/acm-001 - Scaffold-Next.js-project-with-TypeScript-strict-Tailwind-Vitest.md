---
id: ACM-001
title: Scaffold Next.js project with TypeScript strict + Tailwind + Vitest
status: In Progress
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 14:29'
labels: []
milestone: m-0
dependencies: []
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bootstrap the repo so all subsequent tasks have a working base. No app code yet — just tooling.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 next.config.ts compiles with output standalone
- [ ] #2 tsconfig.json has strict: true
- [ ] #3 tailwind.config.ts present
- [ ] #4 vitest.config.ts present, pnpm test exits 0
- [ ] #5 pnpm lint exits 0 on empty src/
- [ ] #6 Makefile with check target running scripts/check.sh
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Worktree task/1-scaffold-nextjs at ../albion-builds-task-1
2. Scaffold Next.js App Router + TS + Tailwind + ESLint with pnpm, src/ dir, alias @/*
3. tsconfig strict:true; next.config.ts output:'standalone'
4. Add Vitest + @vitejs/plugin-react + RTL + jsdom; vitest.config.ts; smoke test
5. Makefile 'check' target -> scripts/check.sh (pnpm install --frozen-lockfile, lint, tsc --noEmit, build, test --run)
6. Run make check green, commit conventional, open PR
NOTE: task ACs specify pnpm + src/ (not npm/--no-src-dir); following ACs as canonical.
<!-- SECTION:PLAN:END -->
