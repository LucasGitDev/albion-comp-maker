---
id: decision-022
title: Emit consumables (food/potion) from the consumableitem category
date: '2026-09-08'
status: accepted
---

## Contexto

`src/data/ao-data.json` nao contem nenhum item com slot `food` ou `potion`
(contagem por slot: mainhand 817, head 280, armor 264, shoes 256, cape 196,
offhand 111, mount 100, bag 12). Como `searchItems` faz
`index.bySlot.get(slot) ?? []` (`src/lib/item-index.ts:168`), os slots de
consumivel no editor abrem o ItemPicker e retornam zero resultados (ACM-091).

Causa raiz no pipeline: `scripts/sync-ao-data.ts:48`

```ts
const EQUIPPABLE_CATEGORIES = new Set(["weapon", "equipmentitem", "mount", "transformationweapon"]);
```

e o loop de emissao descarta tudo que nao esta nesse set
(`scripts/sync-ao-data.ts:321`). Consumiveis vivem no no XML
`items.consumableitem` do dump upstream (`ao-data/ao-bin-dumps/items.json`),
que nunca foi incluido.

Inspecao do dump upstream (2026-09-08), `items.consumableitem` = 153 registros:

| slottype | shopcategory | shopsubcategory1 | qtd |
|---|---|---|---|
| food | crafting | fish | 40 |
| food | consumables | food | 58 |
| potion | consumables | potions | 46 |
| potion | consumables | other | 8 |
| potion | consumables | food | 1 |

Ou seja, `@slottype` upstream ja e literalmente `"food"` / `"potion"`, exatamente
os membros da union `Slot` em `src/data/ao-data.d.ts`. Nao ha necessidade de
mapa de traducao de categoria.

A categoria irma `consumablefrominventoryitem` (1362 registros) tem
`@slottype` ausente em 100% dos casos (tomos, loot, vanity, mapas) — nao e
equipavel em comp e fica fora.

## Opcoes consideradas

**A. Incluir `consumableitem` inteira, filtrando so por `@slottype` presente.**
Simples (uma linha no set). Emite 153 itens, mas inclui 40 peixes crus
(`shopcategory=crafting`, `T1..T8_FISH_*`) e 8 fogos de artificio vanity
(`T3_VANITY_CONSUMABLE_FIREWORKS_*`) na busca de food/potion. Peixe cru nao e
consumivel de comp; polui o autocomplete com ~30% de ruido.

**B. Incluir `consumableitem` restrita a `@shopcategory === "consumables"` e
`@shopsubcategory1 ∈ {food, potions}`.** Emite 103 itens (food 58, potion 45,
apos o filtro de nome EN-US ja existente que descarta 2 protótipos
`UNIQUE_WEAPONMASTER_*`). Exclui peixe cru e fogos. Predicado explicito,
ancorado em dois campos upstream estaveis.

**C. Allowlist manual de uniquenames de MEAL/POTION.** Zero ruido, mas quebra a
cada patch da Albion que adiciona uma poção nova, e contradiz o principio do
pipeline de derivar tudo do dump.

## Decisao

**Opcao B.**

Em `scripts/sync-ao-data.ts`, renomear `EQUIPPABLE_CATEGORIES` para
`EMITTED_CATEGORIES`, adicionar `"consumableitem"`, e aplicar um predicado
adicional so para essa categoria:

```ts
const CONSUMABLE_SUBCATEGORIES = new Set(["food", "potions"]);

function isEmittedConsumable(item: RawItem): boolean {
  return item["@shopcategory"] === "consumables"
    && CONSUMABLE_SUBCATEGORIES.has(item["@shopsubcategory1"] ?? "");
}
```

O `slot` emitido continua sendo `item["@slottype"]` sem transformacao.

**Consumiveis nao tem spells.** Nenhum dos 103 registros tem
`craftingspelllist` (verificado: 0 de 103); a habilidade deles esta em
`@consumespell`, que o pipeline nao le. Portanto `resolveSpells` retorna `[]`
naturalmente e o campo `spells` sai como array vazio — shape valido para
`AOItem`. **O pipeline nao deve mapear `@consumespell` para um spell nem
inventar passivo algum**: o slot Q/W/E/passivo do editor nao se aplica a
consumivel (ACM-090 esconde o slot de passiva na UI). Nenhum codigo novo e
necessario para isso, apenas nao adicionar nada.

`twohanded` sai `false` (nenhum tem `@twohanded`) e `maxEnchant` sai 3 para 97
dos 103 e 0 para 8 — coerente com poções/comidas `.1/.2/.3` no jogo, derivado
do mesmo `computeMaxEnchant` (decision-011), sem caso especial.

## Consequencias

- `ao-data.json` passa de 2036 para ~2139 itens; slots novos: `food` 58,
  `potion` 45, ambos com `withSpells = 0`.
- Os floors fixados em `src/__tests__/acceptance.test.ts` (`SLOT_FLOORS` e o
  total 2036/1452) precisam ser atualizados a mao, e `food`/`potion` adicionados
  ao mapa com `withSpells: 0` — assim o slot volta a ser protegido contra a
  mesma regressao.
- O guard `MIN_ITEMS` (decision-004) nao cobre "um slot inteiro vazio". Adicionar
  um guard explicito no emit: falhar se `food` ou `potion` emitirem 0 itens.
  Esse e o mecanismo que impede este bug de voltar silenciosamente.
- Localizacao: os 103 itens tem `LocalizedNames` com `EN-US` e `PT-BR` no
  `formatted/items.json` upstream, entao o filtro de nome existente nao os
  descarta e `pickLocalizedName` resolve nos dois locales. Nada a mudar em
  `src/lib/localized-name.ts`; o fallback de spell da decision-021 nao se
  aplica (consumivel nao tem spell).
- Peixe cru e fogos de artificio continuam invisiveis no editor. Se algum dia
  forem desejados, mudar o predicado, nao a categoria.
