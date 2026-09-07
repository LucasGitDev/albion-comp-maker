---
description: Fecha a task após o merge — gate na master, status Done e limpeza
argument-hint: "<TASK-ID>"
---

Pós-merge da task **$ARGUMENTS**:

1. `git checkout master && git pull`
2. `make check` — se falhar, **pare e reporte**; não marque Done
3. `backlog task edit $ARGUMENTS --final-summary "..."` e `--status Done`
4. `git branch -d task/<id>-slug` e `git worktree remove ../<repo>-task-<id>`
5. Me diga qual é a próxima task pronta
