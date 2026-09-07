---
id: ACM-033
title: >-
  CRÍTICO: página inicial (/) é o placeholder padrão do Next.js, não existe home
  real
status: In Progress
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 17:42'
labels: []
dependencies: []
priority: high
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A rota / renderiza o boilerplate 'create-next-app' (logo Next.js, texto 'To get started, edit the page.tsx file', botões Deploy Now/Documentation). Não há branding do produto, não há lista de comps, não há CTA para criar uma nova comp. Isso é a primeira impressão do usuário e hoje comunica 'projeto não terminado'. Referência: albiononlinebuilds.com tem header com logo, nav (Builds/Mercado/Info/Ferramentas), busca e botão 'Criar' laranja bem visível no topo direito. Ação: construir home com header/branding, grid de comps existentes (ou empty state 'nenhuma comp ainda' com CTA primário 'Nova comp'), e remover todo conteúdo do template Next.js.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Rota / nao contem nenhum vestigio do template create-next-app (sem next.svg, sem 'To get started', sem links Deploy/Docs)
- [ ] #2 Home tem branding do produto e um CTA primario visivel 'Nova build' que navega para /build/new
- [ ] #3 Home tem empty state explicito quando nao ha builds salvas
- [ ] #4 metadata.title/description em layout.tsx descrevem o produto, nao 'Create Next App'
<!-- AC:END -->
