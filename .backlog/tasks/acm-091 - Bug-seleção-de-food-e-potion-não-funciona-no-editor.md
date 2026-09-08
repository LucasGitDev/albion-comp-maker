---
id: ACM-091
title: 'Bug: seleção de food e potion não funciona no editor'
status: In Review
assignee: []
created_date: '2026-09-08 14:49'
updated_date: '2026-09-08 22:17'
labels: []
milestone: m-2
dependencies: []
priority: high
ordinal: 89000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ItemPicker abre para slots de food e potion, mas não retorna resultados. O filtro de tipo (food/potion/consumable) está descartando todos os itens do catálogo. Deve funcionar igual à seleção de arma/armadura: busca por nome, resultados com ícone, seleciona e aparece no slot.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Busca por nome retorna resultados de poções ao abrir slot de potion|Busca por nome retorna resultados de comida ao abrir slot de food|Seleção funciona igual aos slots de equipamento|Ícone correto aparece no slot após seleção
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Fix no pipeline de dados (decision-022). NAO mexer em ItemPicker/item-index.

1. scripts/sync-ao-data.ts: renomear EQUIPPABLE_CATEGORIES -> EMITTED_CATEGORIES e adicionar "consumableitem" ao set (linha ~48).
2. scripts/sync-ao-data.ts: exportar e aplicar o predicado de consumivel no loop de emissao (apos o check de categoria, ~linha 321). So a categoria consumableitem passa por ele; as demais seguem inalteradas:
   const CONSUMABLE_SUBCATEGORIES = new Set(["food", "potions"]);
   export function isEmittedConsumable(item: { "@shopcategory"?: string; "@shopsubcategory1"?: string }): boolean {
     return item["@shopcategory"] === "consumables" && CONSUMABLE_SUBCATEGORIES.has(item["@shopsubcategory1"] ?? "");
   }
   Verificavel: emitir food 58 / potion 45 (peixe cru e fogos vanity ficam de fora).
3. NAO emitir spells para consumiveis. Nenhum dos 103 registros tem craftingspelllist (0/103), entao resolveSpells ja retorna [] e spells sai []. Nao ler @consumespell, nao inventar passiva (ACM-090 esconde o slot de passiva na UI). Isso significa: nenhuma linha nova de codigo neste passo.
4. scripts/sync-ao-data.ts: adicionar guard-rail no emit, no mesmo espirito do MIN_ITEMS (decision-004) — falhar com [fatal] se a contagem de itens com slot "food" ou slot "potion" for 0. E esse guard que impede a regressao voltar em silencio; sem ele o MIN_ITEMS de 1500 continua passando com food/potion zerados.
5. scripts/sync-ao-data.test.ts: adicionar describe(\"isEmittedConsumable\") com 4 casos usando shapes reais — T4_MEAL_OMELETTE (consumables/food -> true), T4_POTION_HEAL (consumables/potions -> true), T4_FISH_FRESHWATER_ALL_COMMON (crafting/fish -> false), T3_VANITY_CONSUMABLE_FIREWORKS_BLUE (consumables/other -> false).
6. Regenerar os artefatos e commitar ambos (este e o unico jeito do fix chegar ao runtime; o app importa o JSON commitado):
     pnpm sync:ao --force && pnpm build:fixture
   Isso reescreve src/data/ao-data.json (campo version = data de hoje, esperado) e src/__tests__/fixtures/ao-corpus.json. Verificavel:
     node -e \"const d=require('./src/data/ao-data.json');const c={};for(const i of d.items)c[i.slot]=(c[i.slot]||0)+1;console.log(c)\"
   deve mostrar food 58 e potion 45 (tolerar drift upstream de +/- alguns itens; o que nao pode e 0).
7. src/__tests__/acceptance.test.ts: atualizar a mao os numeros fixados (o proprio arquivo instrui isso nas linhas 100-119) — total de itens 2036 -> novo valor (~2139), o total withSpells 1452 permanece, e adicionar ao SLOT_FLOORS: food: { total: 58, withSpells: 0 }, potion: { total: 45, withSpells: 0 }. Usar os numeros reais do artefato regenerado, nao os estimados aqui.
8. Localizacao: nada a fazer. Os 103 itens tem EN-US e PT-BR em formatted/items.json, entao o filtro de nome ja existente (sync-ao-data.ts:327) nao os descarta e pickLocalizedName resolve nos dois locales. A cadeia de fallback da decision-021 e so para spells e nao se aplica.
9. make check (npm ci, lint, tsc --noEmit, build, test) deve sair 0.
10. Verificacao manual (obrigatoria, DoD item 3): abrir o editor, clicar no slot de Comida -> buscar \"omelete\" -> resultado com icone -> selecionar -> icone aparece no slot. Repetir no slot de Pocao com \"cura\". Confirmar que o card do item de consumivel nao mostra slot de passiva.

Fundamentacao e alternativas descartadas: decision-022.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
ROOT CAUSE (orchestrator, verificado): nao e filtro de slotType na UI. ao-data.json nao contem NENHUM item de food ou potion. Contagem por slot no artefato atual: mainhand 817, head 280, armor 264, shoes 256, cape 196, offhand 111, mount 100, bag 12 — food 0, potion 0. O index.bySlot.get('food') retorna undefined -> [] em src/lib/item-index.ts:168, por isso zero resultados. A correcao pertence ao pipeline de dados (classificacao/emissao de consumiveis), nao ao ItemPicker. Escopo muda para scripts de download/emissao + regeneracao do ao-data.json.

PLANO (architect, ACM-091): fix e no pipeline, ver campo Plan e decision-022.

Causa exata: scripts/sync-ao-data.ts:48 define EQUIPPABLE_CATEGORIES = {weapon, equipmentitem, mount, transformationweapon} e o loop de emissao (linha 321) descarta toda categoria fora do set. Consumiveis vivem no no items.consumableitem do dump upstream, que nunca foi incluido. O @slottype upstream ja e literalmente 'food'/'potion', identico a union Slot em src/data/ao-data.d.ts — nao ha mapeamento a inventar.

Predicado escolhido (opcao B da decision-022): categoria consumableitem + @shopcategory === 'consumables' + @shopsubcategory1 in {food, potions}. Emite 103 itens (food 58, potion 45), excluindo 40 peixes crus (shopcategory=crafting) e 8 fogos vanity.

Spells: nenhum dos 103 tem craftingspelllist (0/103), logo resolveSpells retorna [] e spells sai vazio sem codigo novo. @consumespell NAO deve ser lido nem mapeado — o pipeline nao inventa passiva para consumivel (ACM-090 esconde o slot de passiva na UI).

touches: scripts/sync-ao-data.ts, scripts/sync-ao-data.test.ts, src/data/ao-data.json, src/__tests__/fixtures/ao-corpus.json, src/__tests__/acceptance.test.ts

ATENCAO orquestrador: esta task reescreve os schemas/artefatos de saida do pipeline (ao-data.json + ao-corpus.json). Serializar contra qualquer outra task que toque o pipeline de dados ou os fixtures.

Implementado conforme plano/decision-022. scripts/sync-ao-data.ts: EQUIPPABLE_CATEGORIES -> EMITTED_CATEGORIES + "consumableitem", predicado isEmittedConsumable (shopcategory=consumables, shopsubcategory1 in {food, potions}) exportado e aplicado so a essa categoria; guard-rail novo falha [fatal] se slot food ou potion emitir 0. Nenhum codigo novo para spells (resolveSpells ja retorna [] para os 103 itens, nenhum tem craftingspelllist).

Artefatos regenerados e commitados: pnpm sync:ao --force && pnpm build:fixture. Contagem real: food 58, potion 45 (bateu exatamente com a estimativa da decision-022). Total emitido 2142 itens (2036 -> 2142), withSpells total 1455.

src/__tests__/acceptance.test.ts: SLOT_FLOORS atualizado com contagens reais (shoes 257/180, head 281/191, armor 265/181 tambem tiveram drift upstream de +1, ja incorporado), food: {total:58, withSpells:0}, potion: {total:45, withSpells:0}. Total pinado 2142/1455.

scripts/sync-ao-data.test.ts: describe("isEmittedConsumable") com os 4 casos do plano (food/potions -> true, crafting fish -> false, vanity fireworks -> false).

Nota: src/data/ao-data.json esta em .gitignore ("committed only after full pipeline") mas nunca havia sido commitado antes; forcei o add (git add -f) para cumprir a instrucao explicita da task de commitar o artefato regenerado, ja que o app le esse arquivo via fs em runtime (src/app/api/items/route.ts, src/lib/build-card-lookups.ts).

make check: 1 flake nao relacionado na primeira rodada (item-index.test.ts perf test, 65ms vs budget 50ms, fora do escopo desta task) — reproduzido isoladamente como flaky, segunda rodada completa passou 589/589 verde.

PR #59: https://github.com/LucasGitDev/albion-comp-maker/pull/59
<!-- SECTION:NOTES:END -->
