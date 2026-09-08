---
id: ACM-074
title: 'Editor: estado vazio explícito para itens sem nenhuma ability'
status: Done
assignee: []
created_date: '2026-09-08 00:08'
updated_date: '2026-09-08 15:01'
labels: []
milestone: m-3
dependencies:
  - ACM-040
ordinal: 74000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fatiado da ACM-040. Hoje src/components/editor/SpellPicker.tsx:34-35 retorna null quando o item não tem nenhum grupo com candidatos. Do ponto de vista do usuário, 'item sem abilities' e 'abilities não carregaram / bug' são visualmente idênticos — ambos não mostram nada. Como o diferencial do produto declarado no CLAUDE.md é 'validar quais habilidades cada item realmente tem', a ausência precisa ser afirmativa, não silenciosa.

Escopo: apenas o ramo de retorno vazio do SpellPicker (e seu uso em SlotCard e SwapRow, que já o montam). Não mexer na derivação de candidatos nem no store.

Depende da ACM-040: enquanto a grade não receber spellCandidatesBySlot, todo slot da grade cai no ramo vazio e é impossível distinguir o estado real.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 SpellPicker deixa de retornar null quando não há candidatos e passa a renderizar um estado vazio identificável por data-testid="spell-picker-empty"
- [ ] #2 O estado vazio só aparece quando existe um item equipado no slot; slot vazio continua não renderizando nada relacionado a abilities
- [ ] #3 O texto do estado vazio afirma que o item não possui abilities (PT-BR), usa token de cor existente text-icon-muted e nenhum hex cru
- [ ] #4 O estado vazio não é interativo: não é focável por Tab e não possui role de botão
- [ ] #5 Teste automatizado: item com spells renderiza spell-picker e não renderiza spell-picker-empty; item sem spells renderiza spell-picker-empty e não renderiza spell-picker; slot vazio não renderiza nenhum dos dois
- [ ] #6 Altura do SlotCard de um item sem abilities não regride o layout da grade em desktop (o estado vazio ocupa no máximo uma linha de texto)
- [ ] #7 make check verde
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Verificação manual
1. Em /build/new equipar uma Bolsa (slot Bolsa) — item sem abilities. Esperado: mensagem discreta indicando que o item não tem habilidades, no lugar de área em branco.
2. Equipar uma arma com abilities no mainhand. Esperado: fileiras Q/W/E aparecem e a mensagem de vazio NÃO aparece.
3. Limpar o slot da Bolsa. Esperado: nem os chips nem a mensagem de vazio são exibidos.

DIVIDA DE TESTE HERDADA DA ACM-040 (review do PR #48, MEDIUM): o teste 'does not render the spell picker for an item with no resolved spells' em src/__tests__/build-new-page.test.tsx:225-232 e DECORATIVO. Antes do fix de wiring da ACM-040, SlotGrid nao recebia spellCandidatesBySlot/itemNames para NENHUM slot, entao spell-picker nao aparecia em lugar nenhum — inclusive na bag. O teste passava identico antes e depois do fix (foi justamente o unico dos 3 novos que NAO falhou na verificacao red-then-green). Ele nao prova que a ausencia e especifica do item sem spells; so reafirma um estado trivialmente verdadeiro. Ao implementar esta task, SUBSTITUA esse teste por um cenario que preencha simultaneamente um slot COM spells e a bag SEM spells, e asserte que o picker aparece no primeiro e nao no segundo — isso prova especificidade em vez de efeito colateral de wiring quebrado.
<!-- SECTION:NOTES:END -->
