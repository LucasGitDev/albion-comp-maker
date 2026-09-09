---
id: ACM-100
title: >-
  Navegacao: header nao leva a /builds e 'Minhas comps' aponta para landing
  estatica
status: To Do
assignee: []
created_date: '2026-09-09 02:42'
labels: []
milestone: m-3
dependencies: []
priority: medium
ordinal: 98000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
src/components/layout/Header.tsx tem NAV_LINKS com uma unica entrada, 'Minhas comps' -> '/', que hoje e uma landing estatica. /builds existe mas e inalcancavel por navegacao — so por URL digitada. O comentario no proprio arquivo diz '/builds nao existe ainda', o que ficou desatualizado. O disclosure mobile esta atras de NAV_LINKS.length > 1 e por isso nunca aparece.

Alem disso, o CTA do header e 'Nova build' em toda rota nao-editor. O produto e comp-first: a acao primaria global deve ser 'Nova comp'; 'Nova build' e um atalho secundario que so faz sentido dentro de /builds.

Design:
- NAV_LINKS: 'Minhas comps' -> '/', 'Minhas builds' -> '/builds'. Ambas so aparecem com sessao — link para rota que redireciona por falta de auth e um erro de UX.
- Com 2 entradas o disclosure mobile passa a renderizar; validar foco e Escape (ja implementados).
- CTA do header vira 'Nova comp'.
- Breadcrumb (src/components/layout/Breadcrumb.tsx ja existe) deve cobrir comp -> build: 'Minhas comps / ZvZ Terça / Tank principal'.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Header autenticado mostra links para '/' e '/builds' com aria-current correto na rota ativa
- [ ] #2 Header sem sessao nao mostra os links de area logada
- [ ] #3 Disclosure mobile abre com as duas entradas e fecha com Escape devolvendo foco ao trigger
- [ ] #4 CTA primario do header e 'Nova comp' e aponta para o fluxo de criacao de comp
- [ ] #5 Dentro do editor de uma build pertencente a uma comp, o breadcrumb mostra a trilha comp -> build e o link volta para a comp
<!-- AC:END -->
