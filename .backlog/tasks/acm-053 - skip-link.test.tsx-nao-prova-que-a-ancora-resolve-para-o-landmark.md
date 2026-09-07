---
id: ACM-053
title: skip-link.test.tsx nao prova que a ancora resolve para o landmark
status: To Do
assignee: []
created_date: '2026-09-07 19:23'
labels: []
dependencies: []
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da re-review da ACM-037 (PR #31). src/__tests__/skip-link.test.tsx nunca renderiza a ancora de skip JUNTO com o landmark e resolve href -> elemento. Ele so afirma, por pagina e isoladamente, que existe um elemento com id main-content. Ou seja: prova que as DUAS METADES existem separadamente, nao prova que o LINK funciona. Hoje e inofensivo porque os dois lados hardcodam a mesma string literal, mas foi exatamente esse tipo de teste que deixou passar a ancora morta corrigida nesta task — o bug original (skip link apontando para #main-content inexistente em /) passaria neste teste. Reescrever para renderizar a arvore real, ler o href da ancora, e assertar que document.querySelector(href) existe e e focavel.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 O teste le o href real da ancora de skip e resolve para um elemento existente, em vez de hardcodar a string
- [ ] #2 O teste falha se o landmark for removido ou o id for renomeado em qualquer rota que renderize o skip link
- [ ] #3 Cobre / e /builds e /build/new
- [ ] #4 make check verde
<!-- AC:END -->
