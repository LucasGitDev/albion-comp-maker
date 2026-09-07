---
id: ACM-051
title: >-
  Rate limiter: eviction por ordem de insercao permite reset da janela do
  proprio usuario
status: In Progress
assignee: []
created_date: '2026-09-07 19:08'
updated_date: '2026-09-07 19:56'
labels: []
dependencies: []
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM carregado das duas reviews da ACM-018. src/lib/rate-limit.ts agora tem cap de 10k buckets com eviction do mais antigo. Mas a eviction e por ordem de INSERCAO no Map, que nao e o mesmo que recencia de atividade — 'bucket.count += 1' nao reordena a chave no Map. Consequencia: um usuario cujo bucket foi criado cedo e que permanece continuamente ativo e o 'mais antigo' e e despejado primeiro assim que o mapa passa de 10k entradas, zerando silenciosamente a propria janela/contagem. Bypass real do cap de 30 writes/min, embora de alto esforco: exige gerar userIds distintos suficientes (contas descartaveis) para empurrar o mapa alem de 10k mais rapido do que a propria janela fecha. Somado a limitacao ja documentada de ser single-process/in-memory, o limiter hoje e best-effort. Trocar por LRU real (reordenar no acesso) ou por eviction baseada em expiracao da janela.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Eviction baseada em recencia de acesso ou em expiracao da janela, nao em ordem de insercao
- [ ] #2 Teste provando que um usuario continuamente ativo nao tem a janela zerada quando o mapa excede o cap
- [ ] #3 Limitacao single-process documentada no proprio modulo
- [ ] #4 make check verde
<!-- AC:END -->
