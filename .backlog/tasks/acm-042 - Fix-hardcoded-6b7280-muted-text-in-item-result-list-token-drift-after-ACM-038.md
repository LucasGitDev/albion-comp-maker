---
id: ACM-042
title: >-
  Fix hardcoded #6b7280 muted text in item-result-list (token drift after
  ACM-038)
status: Done
assignee: []
created_date: '2026-09-07 17:50'
updated_date: '2026-09-07 18:52'
labels: []
dependencies: []
priority: medium
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ACM-038 retuned --color-icon-muted de #6b7280 para #9ca3af para passar WCAG 4.5:1 (7.07:1 sobre #14171d, 7.80:1 sobre #0a0a0a). Mas src/components/item-picker/item-result-list.tsx:161 e :170 hardcodam text-[#6b7280] em vez de usar o token, entao esses dois textos ficaram para tras e AINDA falham contraste (3.71:1 sobre a superficie). NAO confundir com src/components/build-card/tokens.ts:35 TIER_COLOR_LOW=#6b7280: esse e cor de TIER, espelha --color-tier-low, e esta correto como esta — nao alterar.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 item-result-list.tsx usa var(--color-icon-muted) em vez de #6b7280 hardcoded nas linhas 161 e 170
- [ ] #2 Nenhum texto do ItemPicker fica abaixo de 4.5:1 sobre a superficie do dropdown
- [ ] #3 TIER_COLOR_LOW em build-card/tokens.ts permanece #6b7280 (cor de tier, nao de texto) — nao tocar
- [ ] #4 make check verde
<!-- AC:END -->
