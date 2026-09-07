---
id: ACM-038
title: >-
  IMPORTANTE: hierarquia visual quebrada — fundo branco da página conflita com
  card escuro, nenhum elemento se destaca como ação primária
status: In Progress
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 17:42'
labels: []
dependencies: []
priority: high
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A página /build/new tem fundo branco (herdado do body padrão) enquanto o card de edição é dark (quase preto), criando um contraste abrupto e não intencional nas bordas do card. Não há nenhum botão ou elemento que se destaque como 'próxima ação' — o olho não sabe se deve preencher nome, escolher papel, ou clicar num slot primeiro. Nas referências (albiononlinegrind.com/builds e albiononlinebuilds.com) todo o layout usa um tema dark consistente de ponta a ponta, com uma cor de destaque (laranja/azul) reservada só para CTAs (botão 'Criar', 'Subscribe on Patreon', badges de categoria). Ação: unificar o tema (dark consistente do body ao card) e reservar uma cor de acento exclusiva para ações primárias (salvar, criar, adicionar item).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tema dark consistente: body e paginas usam o mesmo fundo escuro do card, sem faixa branca
- [ ] #2 Remover dependencia de prefers-color-scheme para o fundo — dark e o tema padrao fixo
- [ ] #3 Existe um token de cor de acento reservado a acoes primarias, distinto de --color-enchant (que marca hover/estado de slot)
- [ ] #4 Contraste texto/fundo >= 4.5:1 nos textos principais
<!-- AC:END -->
