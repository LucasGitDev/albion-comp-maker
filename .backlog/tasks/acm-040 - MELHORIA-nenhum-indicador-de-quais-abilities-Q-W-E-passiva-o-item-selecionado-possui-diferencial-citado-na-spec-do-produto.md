---
id: ACM-040
title: >-
  Editor: ligar spellCandidatesBySlot e itemNames no SlotGrid (ability slots
  existem mas não recebem dados)
status: Done
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-08 00:39'
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
- [x] #1 Em src/app/(editor)/build/new/page.tsx a chamada de <SlotGrid> passa spellCandidatesBySlot, derivado por useMemo a partir do spellCandidatesByItemId já existente e do item equipado em cada slot (sem recalcular groupSpellsForItem por render)
- [x] #2 A mesma chamada de <SlotGrid> passa itemNames={itemNames}; o SlotCard de um slot preenchido exibe o nome localizado do item e não o uniquename cru
- [x] #3 Com um item de arma que possui spells equipado no mainhand, o elemento data-testid="spell-picker" está presente dentro do SlotCard do mainhand, e existe uma linha data-testid="spell-group-<g>" para cada grupo que o item realmente expõe
- [x] #4 Um item sem nenhuma spell resolvida (ex.: bolsa/capa/montaria) não renderiza data-testid="spell-picker" — nenhum grupo vazio é exibido
- [x] #5 Clicar em um chip de ability chama actions.setSpell e o chip fica com aria-pressed="true"; clicar no chip já selecionado limpa a seleção (spell volta a null)
- [x] #6 Trocar o item de um slot zera as spells daquele slot e os chips passam a refletir os candidatos do novo item, sem resquício do item anterior
- [x] #7 Teste automatizado cobrindo a grade principal (não os swaps) que falha no main atual e passa depois: item com spells renderiza spell-picker no SlotCard; item sem spells não renderiza; e o nome localizado aparece no card
- [ ] #8 Nenhum arquivo fora de src/app/(editor)/build/new/page.tsx e dos arquivos de teste correspondentes é modificado (SpellPicker, SlotCard e SlotGrid ficam intactos)
- [x] #9 make check verde
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

Wiring fix applied: page.tsx now derives itemNamesBySlot and spellCandidatesBySlot (useMemo, adapted from the existing uniquename-keyed itemNames/spellCandidatesByItemId) and passes both into <SlotGrid>. SlotGrid/SlotCard/SpellPicker left untouched per scope lock. Added 3 regression tests in build-new-page.test.tsx; confirmed red (spell-picker missing, uniquename shown) by temporarily reverting the two new props, then green after restoring. make check green: lint, tsc, next build, 374 vitest tests passing. PR: https://github.com/LucasGitDev/albion-comp-maker/pull/48. Manual browser verification of the 3 steps in the task notes not yet performed by this agent — pending before Done.

Review round 2 fix: the LOCALE lookup was an exact-key index (item.localizedNames[LOCALE]) against a lowercase "en-US" constant, while the real ao-data.json artifact keys localizedNames uppercase (EN-US/PT-BR) -- confirmed by reading the artifact directly. Every lookup silently missed and fell back to the raw uniquename across the whole page (main slot names, swap names, and every spell name via groupSpellsForItem), including the swaps section which had looked correct only because its test fixture used the same wrong-cased assumption.

Root cause was systemic, not local to page.tsx: added src/lib/localized-name.ts (pickLocalizedName) doing a case-insensitive lookup, and applied it everywhere a raw localizedNames[locale]/[key] index existed: src/app/(editor)/build/new/page.tsx, src/components/editor/spell-groups.ts (groupItemSpells, used by both the main grid and swaps), src/lib/build-card-lookups.ts (public build-card SSR page, same bug), src/lib/item-index.ts (ItemPicker search index -- names map was silently empty for every item since SEARCHED_LOCALES is lowercase), and src/components/item-picker/item-result-list.tsx (item picker result rows). Kept LOCALE as "en-US" (matches the rest of the app's convention); pickLocalizedName normalizes casing so neither casing convention can silently regress again.

Fixed all localizedNames test fixtures across src/__tests__ to use the real artifact casing (EN-US/PT-BR) instead of the wrong assumption that had let this pass review round 1 -- files: spell-picker-groups, item-picker-polish, item-picker, build-new-page-group-nav, slot-picker-popover-a11y, build-new-page, api-items-route, item-index.

Red/green verified manually: reverted the page.tsx lookup back to the exact-key form, ran build-new-page.test.tsx -> 1 failed/19 passed ("shows the localized item name on the slot card instead of the raw uniquename" failed, textContent was T4_MAIN_SWORD). Restored the fix -> 20/20 passed. make check green: lint, tsc, next build, 374 vitest tests. Rebased onto origin/main.

Scope note: this touched files beyond page.tsx (spell-groups.ts, build-card-lookups.ts, item-index.ts, item-result-list.tsx) because the defect (exact-case localizedNames lookup) was present in every consumer, per explicit reviewer instruction to fix "o mesmo defeito" wherever found rather than patching only the one call site AC#8 originally scoped to.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
PR #48 merged. main verde (387 testes).

ENTREGUE: o bug era WIRING, nao feature faltante — ability slots ja existiam desde a ACM-010 e funcionavam nos Swaps, mas <SlotGrid> nao recebia spellCandidatesBySlot/itemNamesBySlot, entao SpellPicker recebia undefined, filtrava zero grupos e retornava null (falha silenciosa). Corrigido com dois useMemo adapters em page.tsx, indexados por Slot (nao por itemId, o que evita colisao quando dois slots tem o mesmo item).

AC#8 NAO FOI CUMPRIDO — DELIBERADAMENTE, com autorizacao explicita do orquestrador. O AC travava o escopo em page.tsx + testes. A verificacao visual contra o catalogo REAL bloqueou o PR e revelou um defeito maior: LOCALE='en-US' nao batia com as chaves reais EN-US/PT-BR do ao-data.json, e TODO nome (item e ability) caia no fallback do uniquename. O mesmo defeito existia em mais 4 consumidores, dois deles graves: src/lib/item-index.ts (indice de BUSCA do ItemPicker — o mapa names estava vazio para TODOS os itens, ou seja busca por nome localizado nunca funcionou) e src/lib/build-card-lookups.ts (pagina publica SSR — links compartilhados no Discord mostravam uniquename cru). Corrigir so page.tsx teria deixado o AC#2 verde na aparencia e o produto quebrado. Solucao: src/lib/localized-name.ts (pickLocalizedName, lookup case-insensitive) aplicado nos 5 consumidores.

CAUSA RAIZ DE TER PASSADO NO GATE NA RODADA 1: a fixture de teste usava localizedNames: { 'en-US': ... }, espelhando a suposicao errada do codigo. O teste provava apenas que o codigo concordava consigo mesmo. 8 arquivos de fixture foram corrigidos para o casing real. Licao registrada: fixture que nao reflete o artefato real transforma o teste em eco, nao em verificacao.

VERIFICACAO: ui-reviewer aprovou contra dados reais (nomes localizados na grade e nas abilities, busca por nome localizado E por uniquename funcionando, bag sem secao vazia, 390px ok, pagina publica SSR renderizando nome localizado — validada inserindo linha temporaria no DB). Cobertura de regressao para build-card-lookups adicionada e verificada por mutacao pelo orquestrador: revertendo para o acesso direto, o teste falha com "expected 'T4_MAIN_SWORD' to be 'Broadsword'"; restaurado, passa.

FOLLOW-UPS ABERTOS: ACM-074 (empty state + substituir teste decorativo herdado), ACM-078 (overflow horizontal do breadcrumb em 390px), ACM-079 (passivas sem traducao no proprio artefato de dados).
<!-- SECTION:FINAL_SUMMARY:END -->
