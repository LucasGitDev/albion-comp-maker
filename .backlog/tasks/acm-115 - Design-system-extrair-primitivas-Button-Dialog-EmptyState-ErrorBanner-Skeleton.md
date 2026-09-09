---
id: ACM-115
title: >-
  Design system: extrair primitivas Button, Dialog, EmptyState, ErrorBanner,
  Skeleton
status: To Do
assignee: []
created_date: '2026-09-09 17:38'
labels:
  - ui
  - design-system
  - refactor
dependencies: []
priority: medium
ordinal: 113000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Não existe src/components/ui/. Todos os primitivos são re-inline como strings Tailwind. Classes de botão accent duplicadas 9x verbatim; banner de erro duplicado 4x; caixa dashed de empty state duplicada 5x; raw red-500 em 4+ arquivos ignorando token --color-icon-error-fg já definido em globals.css. Três implementações independentes de overlay/focus-trap (AddBuildDialog, DeleteBuildDialog, EditorActionBar popover). Auditoria uiux de 2026-09-09.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 src/components/ui/Button.tsx com variantes: primary, secondary, ghost, danger
- [ ] #2 src/components/ui/Dialog.tsx com focus trap, Escape e restore de foco (substitui 3 implementações manuais)
- [ ] #3 src/components/ui/EmptyState.tsx com slots: icon, title, description, cta
- [ ] #4 src/components/ui/ErrorBanner.tsx usa token --color-icon-error-fg (não raw red-500)
- [ ] #5 src/components/ui/Skeleton.tsx com animate-pulse e tema-awareness
- [ ] #6 Componentes existentes migrados para usar os primitivos sem quebrar make check
- [ ] #7 Nenhuma regressão visual (uiux confirma antes de done)
<!-- AC:END -->
