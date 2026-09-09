---
id: ACM-109
title: 'Polish UI states: toast de sucesso, spinner, empty state icon, paginação'
status: To Do
assignee: []
created_date: '2026-09-09 17:28'
labels:
  - ui
  - polish
  - frontend
dependencies: []
ordinal: 107000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Audit identificou 4 gaps de UI states no MVP atual. Trabalho independente por área — criar subtasks por gap.

## Contexto
Audit de UI states (2026-09-09) mapeou o que está implementado vs. faltando:

### ✅ Implementado
- Empty state: texto + CTA em /builds e /comps
- Pending: botões desabilitados via isPending + useTransition
- Skeleton: CompListSkeleton (só comp list)
- Error: banner inline + retry (BuildsListManager, NewCompForm, CompBuildsManager)
- Populated: truncate em nomes longos

### ❌ Gaps por prioridade
1. **Toast de sucesso** — ações de duplicar, tornar pública/privada, salvar build são silenciosas (nenhum feedback visual ao usuário)
2. **Spinner visual** — isPending desabilita botões mas não mostra progresso visual; builds list não tem skeleton
3. **Ícone no empty state** — empty states têm só texto, sem ilustração ou ícone SVG
4. **Paginação** — listas crescem sem limite, sem cursor/limit

## Arquivos relevantes
- src/components/builds/BuildsListManager.tsx (toast + spinner)
- src/components/comp/CompBuildsManager.tsx (toast + spinner)
- src/app/builds/page.tsx + src/app/comps/page.tsx (empty state icon, paginação)
- src/components/comp/CompListSkeleton.tsx (referência de skeleton existente)
<!-- SECTION:DESCRIPTION:END -->
