---
id: ACM-040
title: >-
  Editor: ligar spellCandidatesBySlot e itemNames no SlotGrid (ability slots
  existem mas não recebem dados)
status: In Progress
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-08 00:10'
labels: []
milestone: m-3
dependencies: []
priority: medium
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
CORREÇÃO DE PREMISSA: a investigação mostrou que os ability slots Q/W/E/Passiva NÃO estão faltando — estão implementados e testados desde a ACM-010 (Done). O que falta é wiring de duas props no único call site do SlotGrid.

Evidência:
- src/components/editor/SlotCard.tsx:238 monta <SpellPicker> quando onSpellChange existe.
- src/components/editor/SpellPicker.tsx:34-35 filtra os grupos por candidatesByGroup e retorna null quando nenhum grupo tem candidatos.
- src/components/editor/SlotGrid.tsx aceita as props spellCandidatesBySlot e itemNames e as repassa para o SlotCard.
- src/app/(editor)/build/new/page.tsx:133-137 JÁ calcula spellCandidatesByItemId via groupSpellsForItem, e :125 calcula itemNames.
- src/app/(editor)/build/new/page.tsx:216-225 (chamada do <SlotGrid>) passa 9 props e NÃO passa nem spellCandidatesBySlot nem itemNames. Consequência: candidatesByGroup chega undefined -> {} -> SpellPicker retorna null -> nenhuma ability aparece na grade principal, e o card mostra o uniquename cru no lugar do nome localizado.
- Prova por contraste: :232-245 (<SwapsSection>) recebe spellCandidatesByItemId e itemNames — por isso as abilities funcionam na seção de Swaps e não na grade. Mesmo bug, um call site só.

Tamanho: wiring, não feature. Um call site + derivação por slot (o SlotGrid quer chaveado por Slot, a página tem chaveado por itemId — precisa de um useMemo de adaptação) + testes. NÃO criar componente novo, NÃO alterar SpellPicker/SlotCard/SlotGrid além do necessário.

O empty state para itens que genuinamente não têm nenhuma ability (bolsa, capa, montaria) fica FORA desta task — ver ACM-076.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Em src/app/(editor)/build/new/page.tsx a chamada de <SlotGrid> passa spellCandidatesBySlot, derivado por useMemo a partir do spellCandidatesByItemId já existente e do item equipado em cada slot (sem recalcular groupSpellsForItem por render)
- [ ] #2 A mesma chamada de <SlotGrid> passa itemNames={itemNames}; o SlotCard de um slot preenchido exibe o nome localizado do item e não o uniquename cru
- [ ] #3 Com um item de arma que possui spells equipado no mainhand, o elemento data-testid="spell-picker" está presente dentro do SlotCard do mainhand, e existe uma linha data-testid="spell-group-<g>" para cada grupo que o item realmente expõe
- [ ] #4 Um item sem nenhuma spell resolvida (ex.: bolsa/capa/montaria) não renderiza data-testid="spell-picker" — nenhum grupo vazio é exibido
- [ ] #5 Clicar em um chip de ability chama actions.setSpell e o chip fica com aria-pressed="true"; clicar no chip já selecionado limpa a seleção (spell volta a null)
- [ ] #6 Trocar o item de um slot zera as spells daquele slot e os chips passam a refletir os candidatos do novo item, sem resquício do item anterior
- [ ] #7 Teste automatizado cobrindo a grade principal (não os swaps) que falha no main atual e passa depois: item com spells renderiza spell-picker no SlotCard; item sem spells não renderiza; e o nome localizado aparece no card
- [ ] #8 Nenhum arquivo fora de src/app/(editor)/build/new/page.tsx e dos arquivos de teste correspondentes é modificado (SpellPicker, SlotCard e SlotGrid ficam intactos)
- [ ] #9 make check verde
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Verificação manual (obrigatória — task de UI)
1. Abrir /build/new, clicar no slot 'Mão principal' e equipar um item que tenha abilities (ex.: qualquer espada/arco T4+). Esperado: abaixo do card aparece uma fileira de ícones Q, depois W, depois E e, se houver, a fileira de passivas — todos em grayscale/60% de opacidade enquanto não selecionados.
2. Clicar em um ícone da fileira Q. Esperado: ele fica colorido/100% de opacidade e os demais da mesma fileira continuam em grayscale. Clicar nele de novo: volta ao estado não selecionado.
3. Trocar o item do mainhand por outra arma diferente. Esperado: a seleção anterior some e os ícones passam a ser os da nova arma. Conferir também que o card mostra o nome legível do item (ex.: 'Espada Larga') e não 'T4_MAIN_SWORD'.

## Evidência do dimensionamento
Contraste decisivo: SwapsSection recebe spellCandidatesByItemId em page.tsx:232-245 e funciona; SlotGrid em page.tsx:216-225 não recebe e por isso a grade fica sem abilities. É omissão de prop em um único call site, não ausência de feature.

CORREÇÃO DE REFERÊNCIA: o empty state citado acima foi criado como **ACM-074** (não ACM-076).
<!-- SECTION:NOTES:END -->
