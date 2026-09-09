---
id: ACM-078
title: Overflow horizontal em 390px causado pelo breadcrumb
status: To Do
assignee: []
created_date: '2026-09-08 00:21'
updated_date: '2026-09-09 03:07'
labels: []
dependencies: []
priority: low
ordinal: 78000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado da verificacao visual da ACM-040 (PR #48), fora do escopo daquela task. Em 390px document.documentElement.scrollWidth mede 618/554 contra clientWidth de 390 — existe overflow horizontal real na pagina /build/new. A causa foi isolada com Playwright: o elemento mais largo e o nav/ol do Breadcrumb ('Minhas comps > Nova build') no topo da pagina, NAO a grade de slots. Os cards com ability slots Q/W/E/passiva (grid 2-up introduzido pela ACM-041) quebram linha corretamente dentro do card e nao estouram. Pre-existente, introduzido junto com o Breadcrumb da ACM-037.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Em 390px document.documentElement.scrollWidth nao excede clientWidth na rota /build/new,Breadcrumb degrada de forma legivel em telas estreitas (truncar, encurtar rotulo ou quebrar linha) sem perder o caminho de volta exigido pela ACM-037,Teste ou verificacao registrada medindo scrollWidth vs clientWidth em 390px,make check verde
<!-- AC:END -->
