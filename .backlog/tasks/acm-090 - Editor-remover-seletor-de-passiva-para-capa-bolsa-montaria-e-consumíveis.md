---
id: ACM-090
title: 'Editor: remover seletor de passiva para capa, bolsa, montaria e consumíveis'
status: In Review
assignee: []
created_date: '2026-09-08 14:49'
updated_date: '2026-09-09 01:28'
labels: []
milestone: m-2
dependencies: []
priority: high
ordinal: 88000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Capa, bolsa, montaria e consumíveis não têm passiva selecionável no jogo. Remover o slot P desses itens no editor para evitar confusão.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Slot P não aparece para: capa, bolsa, montaria, poção, comida|Slots restantes (Q/W/E) mostrados apenas onde o item realmente os tem
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementação: SpellPicker/SlotCard já eram data-driven (spellCandidatesByGroup vem do resolver de spells reais do item, ao-data.json). Investigação mostrou que cape/bag/mount TÊM um spell kind:"passive" real nos dados (ex: PASSIVE_CAPE_BRIDGEWATCH, PASSIVE_MAXLOAD, PASSIVE_MAXLOAD_HORSE) - não é ausência de dado, é um efeito always-on do item que o resolver corretamente captura como "passive" mas que não é uma habilidade selecionável no jogo (sem alternativas para escolher). food/potion já não tinham nenhum spell resolvido, então já ficavam sem P.

Decisão: como o resolver não tem sinal para diferenciar "passiva sempre ativa" de "passiva selecionável", usei exclusão explícita por slot (cape/bag/mount/food/potion) em SlotCard.tsx, filtrando o grupo "passive" de spellCandidatesByGroup antes de repassar para SpellPicker e para o efeito de auto-seleção (ACM-089). Documentado inline no código (NON_SELECTABLE_PASSIVE_SLOTS).

Fora de escopo (não tocado): build-card/SpellStrip, SpellRow, CardSlotTile (renderização do card exportado em PNG) — usam um lookup separado (spellGroupsByItem) e a task/título fala especificamente do "seletor" no editor. Se o card exportado também precisar excluir P para essas categorias, é uma task separada.

Testes: novo arquivo src/__tests__/slot-card-no-passive-picker.test.tsx cobrindo as 5 categorias + caso de controle (armor continua mostrando P).

make check: verde (lint 0 erros/2 warnings pré-existentes de <img>, tsc ok, build ok, 609/609 testes vitest).

## Review (auditoria, não implementador)

Veredito: BLOCKED: 3 findings (1 HIGH, 2 MEDIUM).

### HIGH — Divergência editor vs. card exportado (produto)
Arquivos: src/components/editor/SlotCard.tsx (NON_SELECTABLE_PASSIVE_SLOTS) vs. src/lib/build-card-lookups.ts + src/components/build-card/SpellRow.tsx + CardSlotTile.tsx.

Cenário de falha concreto A (builds já existentes): um build criado antes deste merge onde o usuário já selecionou manualmente o passivo de uma capa (ex.: PASSIVE_CAPE_BRIDGEWATCH — isso era possível pré-PR, já que o picker de P para cape existia e não era auto-selecionado, AUTO_SELECT_GROUPS = ["e"] apenas). Após o merge, o SlotCard não renderiza mais o grupo "passive" para slot=cape, então o usuário não consegue mais ver nem limpar esse valor pela UI do editor — mas `item.spells.passive` continua no BuildState. O card exportado (BuildCard/CardSlotTile/SpellRow) usa `lookups.spellGroupsByItem` derivado de `groupItemSpells` (src/lib/build-card-lookups.ts), que não aplica nenhuma exclusão por slot — logo o PNG exportado para o Discord continua mostrando o chip/ícone do passivo da capa. Editor e card exportado mostram estados diferentes do mesmo build, e o valor ficou órfão/inacessível.

Cenário de falha concreto B (builds novos): mesmo sem nunca ter setado `spells.passive`, `spellGroupsByItem[itemId]` para uma capa/bolsa/montaria continua incluindo "passive" (groupItemSpells não sabe de NON_SELECTABLE_PASSIVE_SLOTS). `SpellRow` itera `spellGroups` e renderiza um `SpellIcon` para o grupo mesmo com `sprite === null` — `SpellIcon` trata isso como estado "empty" e ainda desenha o badge "P" vazio (ver src/components/icons/SpellIcon.tsx). Resultado: o PNG exportado passa a ter um chip "P" vazio pendurado embaixo de toda capa/bolsa/montaria, coisa que a task pretendia eliminar do produto e que agora está pior (chip fantasma) especificamente no artefato que é o diferencial do produto (export Discord-ready, ver CLAUDE.md "Competitor reference").

O implementer classificou build-card/* como fora de escopo por título ("Editor: remover seletor..."), mas o AC #1 diz apenas "Slot P não aparece para: capa, bolsa, montaria, poção, comida", sem restringir a "no editor" — e o card exportado é a saída final visível ao usuário/guild. Considero o AC não totalmente atendido enquanto essa divergência existir, ou no mínimo exijo uma task de follow-up já criada e linkada antes de fechar este slice como Done.

### MEDIUM — Local da exclusão (arquitetura)
A exclusão por categoria (NON_SELECTABLE_PASSIVE_SLOTS) vive em SlotCard.tsx, camada de apresentação do editor. Esse conhecimento de domínio ("cape/bag/mount/food/potion não têm passiva selecionável") já deveria estar perto do modelo/resolver (ex.: um helper único em spell-groups.ts, tipo `filterSelectableSpellGroups(slot, candidatesByGroup)`), reusado tanto por SlotCard quanto por build-card-lookups.ts. Do jeito que está, qualquer novo consumidor de `spellCandidatesByGroup`/`groupItemSpells` precisa lembrar de reaplicar o mesmo Set manualmente — e já divergiu (ver finding HIGH acima). Recomendo centralizar antes de mergear, para eliminar a causa raiz em vez de remendar os dois lugares separadamente depois.

### MEDIUM — Cobertura de teste incompleta
src/__tests__/slot-card-no-passive-picker.test.tsx só cobre o caso em que `spells.passive` já nasce `null` (helper `equipped()` sempre usa esse default). Não há nenhum caso com `spells.passive` pré-populado com um valor real (o cenário que expõe o finding HIGH). Um teste que criasse um EquippedItem de capa com `spells.passive: "PASSIVE_CAPE_BRIDGEWATCH"` e verificasse o que acontece com esse valor (fica órfão? é exposto de algum jeito? é limpado?) teria pego a divergência editor/card antes deste review. O teste atual passaria mesmo com o bug presente, porque nunca cria o estado onde o bug se manifesta.

### Verificado sem problema (não-findings)
- Interação com ACM-089: AUTO_SELECT_GROUPS continua `["e"]` only; o filtro de passive é aplicado antes do efeito de auto-seleção mas nunca havia lógica de auto-select para "passive", então não há regressão no auto-select do E.
- Regressão em armor/head/shoes: `NON_SELECTABLE_PASSIVE_SLOTS` não inclui essas categorias, e o teste de controle ("still renders the passive row... for armor") confirma que continuam mostrando P quando o item tem passiva selecionável legítima.
<!-- SECTION:NOTES:END -->
