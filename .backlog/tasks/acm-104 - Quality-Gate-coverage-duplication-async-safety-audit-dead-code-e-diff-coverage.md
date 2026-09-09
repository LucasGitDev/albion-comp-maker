---
id: ACM-104
title: >-
  Quality Gate: coverage, duplication, async-safety, audit, dead-code e
  diff-coverage
status: In Progress
assignee: []
created_date: '2026-09-09 14:17'
updated_date: '2026-09-09 14:19'
labels:
  - ci
  - quality
  - tooling
dependencies: []
priority: medium
ordinal: 102000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementar quality gate completo como comando local e como CI paralelo em PRs.

Contexto das decisões:
- Race conditions: escopo de 'async safety lint' (@typescript-eslint/no-floating-promises, no-misused-promises)
- Diff coverage: Codecov free (integra com lcov do vitest, PR annotation automático)
- Thresholds: fase 1 = alertas no PR comment sem bloquear CI; fase 2 (após baseline estável) = thresholds bloqueantes
- Pipeline: quality gate completo apenas em PR; push pra main continua rápido (lint+tsc+test)

Métricas alvo:
| Métrica         | Fase 1 (alerta) | Fase 2 (bloqueante) |
|-----------------|-----------------|---------------------|
| Coverage        | 80%             | 90%                 |
| Duplicação      | <15%            | <10%                |
| Linting         | 0               | 0                   |
| Async safety    | 0               | 0                   |
| Vulnerabilities | 0 HIGH/CRITICAL | 0 HIGH/CRITICAL     |
| Dead code       | alerta sempre   | alerta sempre       |

Ferramentas escolhidas:
- Coverage: @vitest/coverage-v8 + reporter lcov
- Duplicação: jscpd
- Async safety: regras @typescript-eslint no ESLint existente
- Vulnerabilities: pnpm audit --prod
- Dead code: knip (warn-only, nunca bloqueia)
- Diff coverage: Codecov free
- PR comment: marocchino/sticky-pull-request-comment (agrega summary de todos os jobs)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 pnpm quality roda localmente e exibe summary de todas as métricas
- [ ] #2 CI tem jobs paralelos: lint, typecheck, test+coverage, duplication, audit, dead-code
- [ ] #3 PR recebe comentário sticky com summary de todas as métricas após cada push
- [ ] #4 Codecov integrado: PR annotation mostra linhas do diff sem cobertura
- [ ] #5 jscpd configurado com threshold 15% e report em stdout
- [ ] #6 knip detecta dead code e reporta sem bloquear CI
- [ ] #7 pnpm audit --prod bloqueia em HIGH ou CRITICAL
- [ ] #8 @typescript-eslint/no-floating-promises e no-misused-promises ativos no ESLint
- [ ] #9 make check (push pra main) não inclui quality gate pesado, mantém velocidade
- [ ] #10 README/doc registra como escalar para fase 2 (thresholds bloqueantes)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Referências de ferramentas

- @vitest/coverage-v8: https://vitest.dev/guide/coverage
- jscpd: https://github.com/kucherenko/jscpd
- knip: https://knip.dev
- Codecov free: https://docs.codecov.com/docs/quick-start
- marocchino/sticky-pull-request-comment: https://github.com/marocchino/sticky-pull-request-comment
- @typescript-eslint/no-floating-promises: https://typescript-eslint.io/rules/no-floating-promises
- @typescript-eslint/no-misused-promises: https://typescript-eslint.io/rules/no-misused-promises

## Escopo de arquivos esperado

- vitest.config.ts — adicionar coverage provider + thresholds + lcov reporter
- .jscpd.json — config jscpd com threshold 15%
- knip.config.ts — config knip
- eslint.config.mjs — adicionar regras async-safety
- .github/workflows/quality.yml — novo workflow paralelo para PRs
- scripts/quality.sh — comando local pnpm quality
- package.json — adicionar script quality e devDeps

## Fase 2 (futura, não implementar agora)

Quando baseline estiver estável:
- coverage threshold para 90% bloqueante
- jscpd threshold para 10% bloqueante
- Documentar em backlog decision
<!-- SECTION:NOTES:END -->
