---
id: ACM-111
title: 'Fix body font: globals.css Arial override impede Geist de renderizar'
status: Done
assignee: []
created_date: '2026-09-09 17:37'
updated_date: '2026-09-09 17:54'
labels:
  - ui
  - quick-win
dependencies: []
priority: high
ordinal: 109000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
layout.tsx carrega Geist e Geist_Mono e os registra como --font-sans/--font-mono em @theme inline, mas globals.css define body { font-family: Arial, Helvetica, sans-serif } que sobrepõe o token. App inteiro renderiza em Arial. Auditoria uiux de 2026-09-09.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 globals.css body font-family usa var(--font-sans) ou é removida para herdar o token do Tailwind
- [ ] #2 make check passa
- [ ] #3 Geist visível no browser em http://localhost:3000
<!-- AC:END -->
