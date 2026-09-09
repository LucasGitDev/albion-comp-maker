---
id: ACM-116
title: 'BuildsListManager: empty state sem CTA e link para página de share ausente'
status: To Do
assignee: []
created_date: '2026-09-09 17:38'
labels:
  - ux
  - navigation
  - quick-win
dependencies: []
priority: medium
ordinal: 114000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
BuildsListManager.empty state tem texto mas nenhum botão CTA para criar build (inconsistente com CompBuildsManager e /comps que têm CTAs). Além disso, BuildsListManager não linka para /builds/[id] (página de share + regenerar slug), tornando a feature de regenerar slug inacessível pela UI. Auditoria uiux + product-spec de 2026-09-09.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Empty state de BuildsListManager tem botão/link para /build/new
- [ ] #2 Cada linha de build em BuildsListManager tem link/botão para /builds/[id] (Compartilhar ou ícone de link)
- [ ] #3 make check passa
<!-- AC:END -->
