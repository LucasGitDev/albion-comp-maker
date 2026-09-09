---
id: ACM-096
title: >-
  Home autenticada lista comps reais (listMyComps) em vez de estado vazio
  hardcoded
status: In Progress
assignee: []
created_date: '2026-09-09 02:41'
updated_date: '2026-09-09 03:06'
labels: []
milestone: m-6
dependencies: []
priority: high
ordinal: 94000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
src/app/page.tsx renderiza a secao 'Minhas comps' com o texto fixo 'Nenhuma comp ainda' e NUNCA chama listMyComps(). O usuario que loga com Discord ve exatamente a mesma tela de quem nao logou: nao existe superficie onde as comps dele aparecam.

Fluxo esperado (3 passos): logar -> ver minhas comps -> abrir/criar.

Design:
- '/' vira split por sessao: sem sessao = landing atual (hero + 'Entrar com Discord' como acao primaria); com sessao = dashboard 'Minhas comps' com grid de CompCard e acao primaria 'Nova comp'.
- Uma tela, uma acao primaria: no estado autenticado 'Nova comp' e primaria e 'Nova build' vira secundaria (link de texto), porque a build isolada e um sub-passo da comp.
- Estado vazio (Zeigarnik): titulo 'Sua primeira comp', subtexto 'Monte a composicao da sua guilda e exporte o PNG pronto pro Discord.', CTA 'Criar comp'. O estado vazio e a unica coisa na tela — nao repetir o hero.
- CompCard mostra: nome, contagem de builds ('4 builds'), data relativa de atualizacao, badge Publica/Privada.
- Estados obrigatorios: loading (skeleton de 3 cards), vazio (acima), erro (mensagem + botao 'Tentar de novo'), sucesso (grid).

Componente novo: CompCard — justificativa: BuildCard renderiza o card de jogo exportavel, semantica totalmente diferente de um item de listagem navegavel.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Usuario autenticado em '/' ve os nomes das comps retornadas por listMyComps()
- [ ] #2 Usuario sem sessao em '/' ve a landing com CTA de login, sem a secao 'Minhas comps'
- [ ] #3 Usuario autenticado sem nenhuma comp ve o estado vazio com CTA 'Criar comp' que navega para /comp/new
- [ ] #4 Cada CompCard mostra nome, numero de builds e badge Publica/Privada, e navega para a pagina da comp ao clicar
- [ ] #5 Falha de listMyComps renderiza erro recuperavel com acao 'Tentar de novo', nao redirect silencioso
<!-- AC:END -->
