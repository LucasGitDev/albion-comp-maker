---
description: Executa uma task ponta a ponta — implementa, testa, revisa e abre PR
argument-hint: "<TASK-ID>"
---

Aja como `orchestrator` e leve a task **$ARGUMENTS** até PR aberto.

Sequência:
1. Confirme que a task tem plano. Se não tem e é não-trivial, rode `/plan $ARGUMENTS` primeiro.
2. `backlog task edit $ARGUMENTS --status "In Progress"` (claim)
3. Spawn `uiux` se a task tem tela e ainda não tem spec visual
4. Spawn `implementer` no worktree `../<repo>-task-<id>`, branch `task/<id>-slug`
5. Spawn `test-engineer` se a cobertura ficou insuficiente
6. Spawn `reviewer`; em paralelo `security-reviewer` se toca auth/tenant/upload/integração; `ui-reviewer` se tem tela
7. Findings CRITICAL/HIGH voltam pro implementer — máximo 3 rodadas
8. `make check` verde → PR → status `In Review` → **pare**

Merge é meu. Não faça merge.
