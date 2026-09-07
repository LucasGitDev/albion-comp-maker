---
id: ACM-033
title: >-
  CRÍTICO: página inicial (/) é o placeholder padrão do Next.js, não existe home
  real
status: To Do
assignee: []
created_date: '2026-09-07 17:36'
labels: []
dependencies: []
priority: high
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A rota / renderiza o boilerplate 'create-next-app' (logo Next.js, texto 'To get started, edit the page.tsx file', botões Deploy Now/Documentation). Não há branding do produto, não há lista de comps, não há CTA para criar uma nova comp. Isso é a primeira impressão do usuário e hoje comunica 'projeto não terminado'. Referência: albiononlinebuilds.com tem header com logo, nav (Builds/Mercado/Info/Ferramentas), busca e botão 'Criar' laranja bem visível no topo direito. Ação: construir home com header/branding, grid de comps existentes (ou empty state 'nenhuma comp ainda' com CTA primário 'Nova comp'), e remover todo conteúdo do template Next.js.
<!-- SECTION:DESCRIPTION:END -->
