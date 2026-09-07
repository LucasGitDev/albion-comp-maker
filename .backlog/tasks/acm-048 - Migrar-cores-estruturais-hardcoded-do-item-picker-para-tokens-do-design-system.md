---
id: ACM-048
title: Migrar cores estruturais hardcoded do item-picker para tokens do design system
status: To Do
assignee: []
created_date: '2026-09-07 18:51'
updated_date: '2026-09-07 18:51'
labels: []
dependencies:
  - ACM-014
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Levantado pelo grep da ACM-042. Alem do drift de texto ja corrigido (text-[#6b7280] -> text-icon-muted), o diretorio src/components/item-picker/ ainda hardcoda varias cores estruturais: #2a2e37 e #14171d (bordas/fundos em item-search-input.tsx, ItemPicker.tsx, item-result-list.tsx), #c8a24a (accent dourado), #f5d98a (texto do mark de highlight), #232833 e #1c1f26 (fundos de hover). Nao sao drift de contraste de texto — sao cores estruturais/accent que nunca foram migradas — por isso ficaram FORA do escopo da ACM-042 de proposito. Consequencia: o item-picker nao responde ao sistema de tema (ACM-014 vai introduzir presets de tema e esses valores nao vao acompanhar). Mapear cada um para um token existente ou criar token nomeado quando nao houver equivalente. Mesma familia de divida da ACM-047 (ExportBar).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Nenhuma cor hex crua permanece em src/components/item-picker/ — todas via tokens
- [ ] #2 Cada hex mapeado para token existente, ou token novo nomeado criado quando nao existir equivalente semantico
- [ ] #3 Aparencia do item-picker permanece visualmente inalterada apos a migracao (sem regressao visual)
- [ ] #4 O item-picker acompanha troca de tema, nao fica preso a valores fixos
- [ ] #5 Contraste de todo texto do picker permanece >= 4.5:1
- [ ] #6 make check verde
<!-- AC:END -->
