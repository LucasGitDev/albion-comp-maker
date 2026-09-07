---
description: Produz o plano de implementação e, se preciso, um ADR para uma task
argument-hint: "<TASK-ID>"
---

Use o agent `architect` para planejar a task **$ARGUMENTS**.

1. `backlog task view $ARGUMENTS --plain`
2. Leia CLAUDE.md, `backlog decision list` e `backlog doc list` antes de decidir qualquer coisa
3. Produza: plano em 3–8 passos verificáveis, campo `touches`, e ADR se a decisão for cara de reverter
4. Grave via `backlog task edit $ARGUMENTS --plan "..."`

Não escreva código. Ao terminar, **pare e mostre o plano** para eu aprovar.
