---
id: ACM-067
title: >-
  UI de gerenciamento de link publico da build (regenerar slug, aviso ao
  renomear)
status: To Do
assignee: []
created_date: '2026-09-07 20:32'
labels: []
dependencies: []
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AC#4 da ACM-021, descopado durante a implementacao e confirmado pelo reviewer como legitimamente fora do escopo daquela task (que entregou as paginas SSR publicas, nao a UI do dono). Falta: na superficie do dono, controles para (a) ver e copiar o link publico da build, (b) regenerar o slug caso o link tenha vazado, (c) aviso claro de que renomear a build NAO muda o slug — o slug e imutavel por design (ACM-018), entao o link continua valido e o nome antigo permanece na URL. Sem isso o usuario nao tem como reagir a um link compartilhado por engano.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dono ve e copia o link publico da build
- [ ] #2 Dono consegue regenerar o slug; o slug antigo deixa de resolver
- [ ] #3 Renomear a build avisa que o slug/link nao muda
- [ ] #4 Regenerar slug exige sessao e valida ownership (mesmo padrao de authz das outras mutations)
- [ ] #5 Rate limit aplicado a regeneracao de slug
- [ ] #6 make check verde
<!-- AC:END -->
