---
description: Mostra a saúde do loop — taxa de gate verde, tentativas por task, o que mais reprova
---

Rode `.claude/loop/loop-report.sh` e interprete o resultado para mim em até 6 linhas.

Procure especificamente por:
- **Taxa de verde de primeira baixa (<50%)**: o `implementer` está recebendo contexto insuficiente, ou as tasks estão grandes demais.
- **Média de tentativas perto do budget**: o critério de aceite está vago.
- **Um `failed_step` dominando**: falta uma skill ou uma regra no `CLAUDE.md` cobrindo aquilo.
- **Tasks travadas**: liste e diga o que destravaria cada uma.

Termine com **uma** mudança concreta no harness que atacaria o maior gargalo.
