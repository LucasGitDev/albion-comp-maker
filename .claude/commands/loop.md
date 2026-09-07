---
description: Roda o loop fechado numa task — implementa, verifica por sinal objetivo, corrige, repete até verde ou budget estourar
argument-hint: "<TASK-ID>"
---

Aja como `orchestrator` e rode o **loop fechado** na task **$ARGUMENTS**.

Este comando não é o `/work`. Aqui você não decide se está bom: o `check.sh` decide.

## Ciclo

1. `.claude/loop/loop-state.sh claim $ARGUMENTS`
2. Leia a task. Se não tem campo `verify:` executável, **pare** e peça para definir — sem critério de saída checável não há loop.
3. Spawn `implementer` no worktree da task.
4. **Verificar**: `.claude/loop/check.sh`
   - Verde → siga para 6.
   - Vermelho → siga para 5.
5. **Corrigir**:
   - `.claude/loop/loop-state.sh attempt $ARGUMENTS` — se sair 1, o budget estourou: devolva a task pra `To Do` com nota de bloqueio contendo o `failed_step` e os erros, e **pare**. Escale para o humano.
   - Leia `.claude/loop/last-check.json`. Use `failed_step` e `errors` — não adivinhe, não rode o comando de novo "pra ver".
   - Devolva ao `implementer` **apenas o erro estruturado**, não o histórico inteiro.
   - Volte para 4.
6. Rode o `verify:` da task. Vermelho → volta para 5.
7. Gates de review (`reviewer`, e `security-reviewer`/`ui-reviewer` quando aplicável). Findings `CRITICAL`/`HIGH` contam como vermelho → volta para 5.
8. Verde em tudo → PR, status `In Review`, **pare**. Merge é do humano.

## Regras do loop

- Nunca marque `Done` na mão: o hook `guard-done` roda o gate e bloqueia se estiver vermelho.
- Nunca rode o gate com `|| true`, `--no-verify` ou pulando passo. Gate maquiado quebra o loop inteiro.
- Cada rodada consome budget. Três correções no mesmo `failed_step` significa que o diagnóstico está errado — pare e reporte em vez de tentar de novo.
- Registre skills usadas: `.claude/loop/loop-log.sh skill_used skill=<nome> task=$ARGUMENTS`
