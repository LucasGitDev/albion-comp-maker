---
id: ACM-109
title: 'Toast system: instalar sonner e wiring em todos os action handlers'
status: In Progress
assignee: []
created_date: '2026-09-09 17:37'
updated_date: '2026-09-09 17:54'
labels:
  - ui
  - ux
  - feedback
dependencies: []
priority: high
ordinal: 107000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zero toasts no app. Todas as ações CRUD (duplicar build, toggle público/privado, excluir, adicionar/remover build de comp, toggle público de comp) são silenciosas no sucesso. BuildsListManager.handleDuplicate prepende o item sem feedback visual — se o usuário scrollou, a ação parece não ter funcionado. doc-009 mapeia este gap como prioridade 1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 sonner instalado como dependência
- [ ] #2 <Toaster /> montado em src/app/layout.tsx
- [ ] #3 toast.success() chamado em: duplicarBuild, toggleBuildPublic, deleteBuild (BuildsListManager)
- [ ] #4 toast.success() chamado em: addBuildToComp, removeBuildFromComp, reorderBuild, toggleCompPublic (CompBuildsManager)
- [ ] #5 toast.success() chamado no onSave do EditorActionBar
- [ ] #6 toast.error() substitui ou complementa ErrorBanner inline quando ação falha silenciosamente
- [ ] #7 Nenhum toast duplica mensagem de erro já visível inline (sem double feedback)
<!-- AC:END -->
