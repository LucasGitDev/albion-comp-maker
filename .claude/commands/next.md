---
description: Escolhe e inicia a próxima task pronta do backlog
---

Aja como `orchestrator`.

1. `backlog task list --plain` — pegue tasks `To Do` sem `depends` aberto
2. Ordene por milestone atual, depois por ID
3. Verifique conflito de `touches` com o que já está `In Progress` — se colide, escolha outra
4. Me diga qual escolheu e por quê, em 2 linhas
5. Siga o fluxo do `/work` para ela

Se não há task pronta, me diga o que está bloqueando e sugira o que destravar primeiro.
