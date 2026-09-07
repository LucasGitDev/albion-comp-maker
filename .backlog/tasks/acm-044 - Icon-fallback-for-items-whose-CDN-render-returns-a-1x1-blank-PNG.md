---
id: ACM-044
title: Icon fallback for items whose CDN render returns a 1x1 blank PNG
status: Done
assignee: []
created_date: '2026-09-07 18:33'
updated_date: '2026-09-07 20:42'
labels: []
milestone: m-1
dependencies: []
priority: low
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verificado em browser real (review do PR #25): UNIQUE_HEAD_VANITY_RANGER_HOOD renderiza icone com naturalWidth=1 (PNG 1x1 em branco) em vez de um glifo visivel. Nao e o glifo de erro '!' e nao e regressao do picker — um item normal (T8_HEAD_LEATHER_AVALON) carrega corretamente a 217x217 pelo mesmo code path. Provavel lacuna de dados/CDN para itens vanity. /api/icon ja devolve um PNG transparente 1x1 como fallback e sempre 200, entao o cliente nao consegue distinguir 'icone ausente' de 'icone valido'. Acao: detectar naturalWidth<=1 no ItemIcon e cair para a silhueta de categoria, ou fazer /api/icon sinalizar o fallback (header ou status) para o cliente poder tratar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Item cujo icone volta 1x1 exibe silhueta de categoria em vez de imagem em branco
- [ ] #2 Item com icone valido continua renderizando o icone oficial
- [ ] #3 make check verde
<!-- AC:END -->
