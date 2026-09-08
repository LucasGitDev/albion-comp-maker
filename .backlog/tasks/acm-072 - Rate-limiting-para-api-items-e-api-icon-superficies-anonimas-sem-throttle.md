---
id: ACM-072
title: Rate limiting para /api/items e /api/icon (superficies anonimas sem throttle)
status: To Do
assignee: []
created_date: '2026-09-08 00:03'
labels: []
dependencies:
  - ACM-063
ordinal: 72000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up identificado pela decision-016 (planejamento da ACM-063). As rotas /api/items (serve o catalogo ao-data.json gzipado a cada request) e /api/icon (proxy de CDN) sao superficies anonimas e continuam sem nenhum throttle apos a ACM-063. Foram deliberadamente EXCLUIDAS do bucket de leitura publica da ACM-063: uma sessao legitima do editor faz muitas chamadas a essas rotas e consumiria a cota das paginas publicas, gerando 429 em uso normal. Precisam de orcamento proprio, dimensionado para o padrao de uso do editor (dezenas de icones por render de pagina), nao para page views.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Throttle aplicado a /api/items e /api/icon com orcamento proprio, separado do bucket de leitura publica da ACM-063,Limite dimensionado para uso legitimo do editor (uma pagina do editor carrega dezenas de icones sem estourar) com racional documentado,Reusa o motor compartilhado de fixed-window-limiter introduzido pela ACM-063 em vez de duplicar logica de eviction,Testes cobrindo o limite e o comportamento apos exceder,make check verde
<!-- AC:END -->
