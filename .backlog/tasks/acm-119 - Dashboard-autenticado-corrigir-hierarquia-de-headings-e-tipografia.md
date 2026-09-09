---
id: ACM-119
title: 'Dashboard autenticado: corrigir hierarquia de headings e tipografia'
status: To Do
assignee: []
created_date: '2026-09-09 17:39'
labels:
  - a11y
  - ux
  - quick-win
dependencies: []
priority: low
ordinal: 117000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Página / autenticada tem h2 como primeiro heading, sem h1 — viola hierarquia WCAG. Títulos de páginas usam tamanhos inconsistentes: dashboard text-lg, /builds /comps text-xl, landing text-3xl. Não há tokens de escala tipográfica em globals.css; cada tamanho é ad-hoc. Auditoria uiux de 2026-09-09.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dashboard autenticado (src/app/page.tsx) tem h1 visible (pode ser visually-hidden se design exigir)
- [ ] #2 Títulos de seção de nível equivalente usam o mesmo utilitário Tailwind em todas as páginas
- [ ] #3 make check passa (tsc + lint)
<!-- AC:END -->
