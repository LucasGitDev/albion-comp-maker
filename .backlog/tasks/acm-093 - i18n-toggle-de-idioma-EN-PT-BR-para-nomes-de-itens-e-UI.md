---
id: ACM-093
title: 'i18n: toggle de idioma EN/PT-BR para nomes de itens e UI'
status: In Progress
assignee: []
created_date: '2026-09-08 14:49'
updated_date: '2026-09-09 02:26'
labels: []
milestone: m-7
dependencies: []
priority: high
ordinal: 91000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nomes dos itens aparecem em inglês. Adicionar toggle de idioma (EN / PT-BR) que persiste no localStorage. Nomes de itens e strings de UI mudam conforme seleção. Relacionado a ACM-023 (i18n routing) — este foca no toggle de idioma para nomes do ao-data.json.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Toggle EN/PT-BR visível no header|Nomes dos itens mudam para o idioma selecionado|Preferência persiste entre sessões (localStorage)|Fallback para EN se tradução PT-BR ausente
<!-- AC:END -->
