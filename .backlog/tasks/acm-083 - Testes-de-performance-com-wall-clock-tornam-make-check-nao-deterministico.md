---
id: ACM-083
title: Testes de performance com wall-clock tornam make check nao-deterministico
status: In Progress
assignee: []
created_date: '2026-09-08 13:18'
updated_date: '2026-09-09 03:10'
labels: []
dependencies: []
priority: medium
ordinal: 81000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
src/__tests__/item-index.test.ts tem duas assercoes de tempo de parede com limite fixo de 50ms:
- 'filters the real-sized mainhand bucket in well under 50ms after the debounce' (linha 168)
- 'builds the full 2036-item index in a single fast pass' (linha 176)

Sob contencao de CPU (varios worktrees rodando make check em paralelo, ou CI compartilhada) elas falham: medido 123ms e 209ms. Rodando o arquivo isolado, os 11 testes passam. Ou seja: make check, que e O GATE do Definition of Done e do hook guard-done, e nao-deterministico. Um gate que falha por carga de maquina treina o time a ignorar vermelho — que e o pior resultado possivel para o harness.

Opcoes a avaliar:
(a) marcar como benchmark separado, fora do make check (ex.: vitest --project bench), rodado sob demanda
(b) trocar o limite absoluto por assercao de complexidade/relativa (ex.: comparar contra baseline medido no mesmo run)
(c) manter mas com limite folgado o suficiente para carga realista, documentando o racional

Preferir (a) ou (b): aumentar o numero magico so adia o problema.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 As assercoes de tempo de parede nao podem mais fazer make check falhar por contencao de CPU
- [ ] #2 make check roda verde de forma repetida (5 execucoes consecutivas) com 3 processos concorrentes de build na maquina
- [ ] #3 A cobertura de performance nao e simplesmente deletada: ou vira benchmark rodavel sob demanda, ou vira assercao relativa/de complexidade
- [ ] #4 A abordagem escolhida esta registrada em backlog decision ou nas notas da task
- [ ] #5 make check verde
<!-- AC:END -->
