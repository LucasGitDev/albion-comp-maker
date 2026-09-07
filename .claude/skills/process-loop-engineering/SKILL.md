---
name: process-loop-engineering
description: >
  Como operar e manter o loop fechado do harness — sinal objetivo em vez de opinião, budget de
  tentativas, critério de saída executável, realimentação de erro estruturado e leitura do
  loop-report. Use ao rodar /loop, ao diagnosticar loop que gira em falso, ao escrever o campo
  verify: de uma task, ou ao decidir se uma task pode ser fechada.
  Examples:
  <example>user: "o loop ficou tentando a mesma coisa 3 vezes" assistant: "process-loop-engineering diagnostica: mesmo failed_step repetido = diagnóstico errado, não falta de tentativa." <commentary>Manutenção do loop.</commentary></example>
---

Um loop só é loop se ele sabe **sozinho** que errou. Sem isso é pipeline com etapas bonitas.

## As quatro peças obrigatórias

| Peça | Sem ela |
|---|---|
| **Sinal objetivo** — exit code + `last-check.json` | O agente vira juiz de si mesmo e sempre se aprova |
| **Critério de saída executável** — campo `verify:` | "Pronto" vira opinião, e a task volta duas semanas depois |
| **Budget** — `loop-state.sh attempt` | O loop gira em falso queimando contexto e dinheiro |
| **Realimentação estruturada** — só `failed_step` + `errors` | O implementer recebe 40k tokens de histórico e perde o sinal no ruído |

## Regras duras

- **Gate nunca é maquiado.** `|| true`, `--no-verify`, `continue-on-error`, pular passo, comentar teste: tudo isso é corromper o único sensor do loop. Se um passo está errado, conserte o passo, não o silencie.
- **Erro estruturado, não transcrição.** Ao devolver para o implementer, mande `failed_step` e as linhas de `errors` do `last-check.json`. Nunca cole a saída inteira do build.
- **Mesmo `failed_step` três vezes = diagnóstico errado**, não falta de tentativa. Pare, reporte a hipótese que falhou e escale. Insistir é o modo mais caro de errar.
- **Uma task por vez no loop.** Duas tasks concorrentes tocando os mesmos `touches` produzem gate vermelho que não é de ninguém.
- **Verde não é permissão para fechar** — é permissão para o *review*. `CRITICAL`/`HIGH` do reviewer contam como vermelho e voltam pro ciclo.

## Escrevendo um `verify:` que presta

Ruim: `verify: usuário consegue fazer login`
Bom: `verify: npm test -- auth.e2e.spec.ts --run`

O `verify:` é um comando que sai 0 ou != 0. Se o critério é visual e não dá para automatizar, ele vira um passo de `ui-reviewer` com screenshot — não um item de checklist que alguém marca no olho.

## Lendo o loop-report

- **Verde de primeira < 50%** → tasks grandes demais ou contexto pobre. Quebre as tasks.
- **Média de tentativas encostando no budget** → critério de aceite vago. O problema está na spec, não no implementer.
- **Um passo dominando as reprovações** → falta regra no `CLAUDE.md` ou uma skill de stack. Isso é o harness pedindo para evoluir.
- **Task travada** → não aumente o budget. Descubra por que o diagnóstico falhou.

O loop-report é o que transforma "acho que o harness melhorou" em evidência. Rode `/loop-report` a cada milestone e mude **uma** coisa por vez.
