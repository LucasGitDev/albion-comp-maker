---
id: ACM-065
title: Contador de slots do EditorActionBar fica invisivel exatamente em 390px
status: To Do
assignee: []
created_date: '2026-09-07 20:31'
labels: []
dependencies: []
ordinal: 65000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bug adjacente encontrado durante a spec da ACM-041 (doc-005). Em src/components/editor/EditorActionBar.tsx o contador de slots usa 'hidden ... sm:inline', entao o progresso (ex.: 3/9) fica INVISIVEL exatamente na largura de 390px — o viewport onde o usuario mais precisa saber quanto falta, porque a grade inteira nao cabe na tela. A decisao de esconder veio da ACM-037, onde o texto de status truncava no mobile e a correcao foi esconder o span decorativo; mas isso removeu o unico indicador de progresso do mobile em vez de reflui-lo. Relacionado: a spec da ACM-041 aponta que o denominador deve excluir offhand travado (build de duas maos), senao 9/9 e inalcancavel, e que hoje EditorActionBar passa um totalSlots fixo — os dois contadores discordariam na tela.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Progresso de slots visivel em 390px, sem truncar o texto de status
- [ ] #2 Denominador exclui offhand travado por arma de duas maos — 9/9 alcancavel
- [ ] #3 Contador da action bar e o da grade de grupos (ACM-041) concordam entre si
- [ ] #4 make check verde
<!-- AC:END -->
