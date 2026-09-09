---
id: ACM-114
title: 'BuildShareStatus e CompShareStatus: adicionar try/catch em todas as mutações'
status: To Do
assignee: []
created_date: '2026-09-09 17:38'
labels:
  - ux
  - reliability
  - bug
dependencies:
  - ACM-109
priority: medium
ordinal: 112000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
handleToggle, handleRegenerate (BuildShareStatus) e handleToggleComp, handleMakeBuildPublic (CompShareStatus) não têm try/catch. Falha de rede, rate-limit ou sessão expirada falha silenciosamente. Auditoria product-spec de 2026-09-09. Arquivos: src/components/build/BuildShareStatus.tsx linhas 34-47; src/components/comp/CompShareStatus.tsx linhas 46-65. Após ACM-109 (toast), usar toast.error().
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Todas as mutações em BuildShareStatus têm try/catch
- [ ] #2 Todas as mutações em CompShareStatus têm try/catch
- [ ] #3 Erro exibe toast.error() com mensagem PT-BR (após ACM-109) ou ErrorBanner inline
- [ ] #4 Toggle revertido para estado anterior em caso de falha (igual a BuildsListManager)
<!-- AC:END -->
