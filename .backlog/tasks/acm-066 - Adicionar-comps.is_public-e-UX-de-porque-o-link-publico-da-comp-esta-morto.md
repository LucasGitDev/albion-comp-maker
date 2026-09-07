---
id: ACM-066
title: Adicionar comps.is_public e UX de porque o link publico da comp esta morto
status: To Do
assignee: []
created_date: '2026-09-07 20:32'
labels: []
dependencies: []
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Vem da decision-015 (ACM-021) e do finding HIGH da review. Hoje comps NAO tem coluna is_public: a ACM-021 definiu que uma comp so e publicamente alcancavel se TODAS as suas builds forem publicas e validas; caso contrario a comp inteira retorna 404. Isso e correto do ponto de vista de seguranca (nenhuma build privada vaza, nenhuma renderizacao parcial revela a estrutura da comp) e a auditoria confirmou que nao ha caminho de render parcial. O PROBLEMA e de produto: o dono compartilha o link no Discord, o link morre, e NADA no app explica o motivo. A proposta de valor inteira do produto e compartilhar comp para o Discord — falhar em silencio exatamente ai e o pior lugar possivel. Duas partes: (1) avaliar adicionar comps.is_public como flag explicita em vez de derivar das builds; (2) independente disso, o dono precisa ver, na propria comp, quais builds estao privadas e portanto quebrando o link publico.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Decidido e documentado se comps ganha is_public explicito ou continua derivando das builds
- [ ] #2 O dono ve quais builds tornam a comp inalcancavel publicamente, antes de compartilhar
- [ ] #3 Nenhuma regressao de seguranca: build privada continua sem vazar, sem render parcial, sem oraculo de existencia
- [ ] #4 Se houver migracao, testada contra banco NAO-VAZIO com linhas referenciando (ver ACM-018/050)
- [ ] #5 make check verde
<!-- AC:END -->
