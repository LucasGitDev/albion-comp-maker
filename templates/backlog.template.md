# Backlog — [[NOME DO PRODUTO]]

> Gerado pelo harness-saas. Edite via `backlog` CLI, nunca à mão.

## Contexto do produto

[[Saída da entrevista grill-me: problema, ICP, proposta de valor, MVP, monetização, stack, não-escopo.]]

## Milestones

- **M1 — Scaffold + Quality Gate**: projeto roda, make check verde, CI passando.
- **M2 — Core**: fluxo principal do produto funcionando end-to-end.
- **M3 — Billing + Auth**: usuário paga, acessa e cancela.
- **M4 — Launch-ready**: landing, onboarding, analytics mínimos.

## Épicos

### [EPIC-001] Scaffold

- [ ] TASK-001 · scaffold monorepo + make check verde · `depends: —` · `touches: /, package.json, Makefile`
- [ ] TASK-002 · CI pipeline (lint, tsc, testes) · `depends: TASK-001`

### [EPIC-002] Auth

- [ ] TASK-010 · autenticação [[provider]] · `depends: TASK-001` · `skills: saas-auth`

### [EPIC-003] Core

> [[Quebrar em tasks de ~meio dia após a entrevista grill-me]]

### [EPIC-004] Billing

- [ ] TASK-040 · integração Stripe + webhook · `depends: TASK-010` · `skills: saas-billing`

### [EPIC-005] Launch

- [ ] TASK-050 · landing page · `skills: revenue-centric-design, marc-lou-review`
- [ ] TASK-051 · onboarding flow · `skills: revenue-centric-design`
