---
id: ACM-033
title: >-
  CRÍTICO: página inicial (/) é o placeholder padrão do Next.js, não existe home
  real
status: In Progress
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 17:48'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
REVIEW PR #21 (branch task/33-home-and-theme, commit da48112) — foco em ACM-033.

AC #1 (sem vestígios do boilerplate create-next-app): OK. next.svg/vercel.svg/file.svg/globe.svg/window.svg removidos de public/ e grep confirma zero referências restantes em src/, public/, configs (manifest/metadata) ou docs — sem risco de 404.
AC #2 (CTA primário "Nova build" → /build/new): OK, presente tanto na home (page.tsx) quanto no Header.
AC #3 (empty state "nenhuma comp ainda"): OK, seção "Minhas comps" com estado vazio explícito.
AC #4 (metadata.title/description do produto): OK, layout.tsx atualizado para "Albion Comp Maker" com descrição do produto.

Escopo: diff real do commit (git diff origin/main...origin/task/33-home-and-theme, three-dot) toca apenas src/app/page.tsx, src/app/layout.tsx, src/app/globals.css, public/*.svg (deleção) e novo src/components/layout/Header.tsx — dentro do limite definido (arquivos + novos arquivos em src/components/layout/). Nenhuma edição fora do escopo autorizado.

Nota de processo: um diff two-dot (origin/main..HEAD) mostra divergência adicional no arquivo de tarefa ACM-032 (branch cortado antes do claim dessa task em main); isso NÃO está no commit do PR — recomenda-se rebase antes do merge por higiene, mas não é um finding de código deste PR.

Achado MEDIUM (compartilhado com ACM-038): Header global montado no layout raiz agora aparece também em /build/new, duplicando cabeçalho/CTA acima do BuildHeader do editor. Não viola nenhum AC de ACM-033, mas é dívida de UX a considerar em ACM-037 (action bar do editor).

Bloqueio real desta rodada vem de ACM-038 AC #4 (contraste), não de ACM-033 — ver notas em ACM-038 para a matemática de contraste. Os 4 ACs de ACM-033 estão atendidos.

VEREDITO (para ACM-033 isoladamente): LGTM.
VEREDITO GERAL DO PR: BLOCKED: 1 finding (HIGH) — ver ACM-038.
<!-- SECTION:NOTES:END -->
