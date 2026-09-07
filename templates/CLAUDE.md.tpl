# CLAUDE.md — [[NOME DO PRODUTO]]

## Produto

[[Uma frase: o que faz e para quem.]]
PRD canônico: `backlog doc list` → "PRD — [[produto]]".

**Fora de escopo v1:** [[lista curta]]

## Stack

- Backend: NestJS + TypeScript · [[ORM]] · [[banco]]
- Frontend: Next.js (App Router) + Tailwind + shadcn/ui
- Testes: Vitest + Playwright
- Deploy: [[onde]]

## Harness

Este projeto usa o plugin `harness-saas`. Agents disponíveis: `orchestrator`, `product-spec`,
`architect`, `implementer`, `test-engineer`, `reviewer`, `security-reviewer`, `uiux`,
`ui-reviewer`, `devex-guard`.

**Toda ação começa lendo a skill `process-backlog-driven`.**
Comandos: `/spec` `/plan` `/work` `/review` `/next` `/ship`.

## Backlog.md

Rode `backlog instructions overview` antes de qualquer ação neste projeto.
Nunca edite arquivos do backlog na mão — use o CLI.
Nunca crie `.md` de documentação solto — use `backlog doc create` / `backlog decision create`.

## Fluxo de trabalho

Todo trabalho não-trivial existe como task no backlog antes da implementação.
Cada task: branch `task/<id>-slug` + git worktree `../[[SLUG]]-task-<id>`. Nunca commite na master.
Board: To Do → In Progress → In Review → Done.

## Quality gate

`make check` → `scripts/check.sh` (install, lint, tsc --noEmit, build, testes). Exit 0 obrigatório.

## Definition of Done

1. escopo respeitado · 2. `make check` verde no branch · 3. verificação manual executada ·
4. decisões registradas · 5. PR merged · 6. `make check` verde na master · 7. branch limpo

## Commits

Conventional Commits: `type(scope): descrição`.
Types: feat, fix, refactor, chore, docs, test.
Scopes: [[api, web, db, ui, auth, billing, config, ci]]
Sem trailer de atribuição a IA.

## Gates humanos

Escopo (aprovar backlog) · Plano (aprovar plano da task) · Merge. No resto o time roda sozinho.
