---
id: decision-004
title: Remapear pipeline para novo schema items.json do ao-bin-dumps
date: 2026-09-07
status: accepted
---

# Remapear pipeline para novo schema items.json do ao-bin-dumps

## Contexto

O pipeline (`scripts/sync-ao-data.ts` + `src/lib/spell-resolver.ts`) emitia **0 items / 9044 spells**.
Investigacao contra os dados reais do upstream (`ao-data/ao-bin-dumps@master`, baixados e verificados
com jq/node) revelou **tres bugs independentes**, nao um so.

### Bug 1 — arquivo errado

`formatted/items.json` (23 MB) **nunca teve** dados de gameplay. Ele e um array plano de 12.237 objetos
apenas com localizacao:

```json
{ "LocalizationNameVariable": "@ITEMS_UNIQUE_HIDEOUT",
  "LocalizationDescriptionVariable": "@ITEMS_UNIQUE_HIDEOUT_DESC",
  "LocalizedNames": { "EN-US": "...", "PT-BR": "...", ... },
  "LocalizedDescriptions": { ... },
  "Index": "1", "UniqueName": "UNIQUE_HIDEOUT" }
```

Nao tem `@slottype`, nao tem `craftingspells`. `buildItemIndex` procurava `.items.item` num array →
0 resultados. Os dados de gameplay estao na **raiz do repo**: `items.json` (17 MB).

### Bug 2 — schema de spells mudou de nome e de forma

Em `items.json` (raiz), a estrutura e `{ "?xml": ..., "items": { <categoria>: [...] } }` com 22 categorias.
O que o codigo esperava vs. o que existe:

| Codigo atual esperava | Realidade verificada |
|---|---|
| `item["@craftingspelllist"]` (string, atributo) | `item.craftingspelllist["@reference"]` (objeto filho) |
| `item.craftingspells.craftingspell` | `item.craftingspelllist.craftspell` |
| `item.craftingspells.removespell` | `item.craftingspelllist.removespell` |
| `spell["@slot"]` | `spell["@slots"]` |

O modelo de heranca **nao mudou**: `@reference` aponta para o `@uniquename` de **outro item**.
Verificado: 1.142 referencias, **0 nao resolvidas**, profundidade maxima de cadeia = **2**
(ex.: `T6_HEAD_LEATHER_SET1`). `removespell` continua existindo (158 ocorrencias em `weapon`).

### Bug 3 — `@slots` nao classifica ativo vs passivo

`@slots` esta **ausente** em 1.101 de 1.632 entradas `craftspell`. O default `?? "passive"` do codigo
antigo esta errado: entre as entradas sem `@slots` ha **476 activespell** e 6 togglespell.
Pior, entre as **com** `@slots` ha **65 passivespell** (armadura com 2 slots passivos usa `@slots` 1 e 2).

Conclusao verificada: **`@slots` e o indice do slot dentro do proprio grupo da spell, nao o tipo dela.**
A classificacao ativo/passivo so pode vir de `spells.json`, cruzando `@uniquename` contra as chaves
`spells.activespell` (8.686) / `spells.passivespell` (321) / `spells.togglespell` (37).
Cobertura verificada: **710 craftspells distintos, 0 ausentes de spells.json**.

### Bug 4 (bonus) — tuid da localizacao tem prefixo

`localization.json` e TMX; os `@tuid` sao `@ITEMS_<uniquename>` e `@SPELLS_<uniquename>`.
O codigo fazia `locIndex.get(uniquename)` cru → sempre miss. Isso sozinho ja zeraria a saida
pelo filtro `if (!locs?.["EN-US"]) skip`.

## Opcoes consideradas

**A) Corrigir o parser mantendo `formatted/items.json` como fonte.**
Impossivel: o arquivo nao contem slottype nem spells. Descartada por fato, nao por preferencia.

**B) Usar so `items.json` da raiz para tudo (gameplay + nomes via `localization.json`).**
Funciona, mas obriga a parsear os 90 MB de TMX so para nomes de item, e o codigo precisa acertar
o prefixo `@ITEMS_`. Custo de RAM/tempo alto no build.

**C) Fontes hibridas (escolhida).**
- `items.json` (raiz, 17 MB) → gameplay: `@slottype`, `@twohanded`, `craftingspelllist`.
- `formatted/items.json` (23 MB) → nomes de item ja indexados por `UniqueName`, 15 locales.
- `spells.json` (14 MB) → classificacao ativo/passivo/toggle.
- `localization.json` (90 MB) → **apenas** nomes de spell (`@SPELLS_<uniquename>`), pois nao existe
  arquivo `formatted/spells.json` no upstream (verificado via API do GitHub).

## Decisao

Adotar a opcao **C**. `formatted/items.json` deixa de ser a fonte de itens e passa a ser
exclusivamente a fonte de nomes de item.

### Regra de resolucao de spell (normativa)

1. Indexar **todos** os itens de **todas** as categorias de `.items` num unico `Map<uniquename, item>`
   (referencias podem cruzar categorias). Pular chaves que nao sejam array: `@xmlns:xsi`,
   `@xsi:noNamespaceSchemaLocation`, `shopcategories`, `hideoutitem`.
2. Subir a cadeia por `item.craftingspelllist["@reference"]` com `Set` de visitados (guarda de ciclo).
3. Reproduzir da raiz para a folha, acumulando `craftspell` e aplicando `removespell`.
4. `category` = `passive` se a spell esta em `spells.passivespell`, senao `active`.
5. `slot` = `Number(spell["@slots"])` quando presente, senao `1`.
6. Normalizar todo campo que pode ser objeto-unico-ou-array (`craftspell`, `removespell`).

### Filtros de emissao

- Emitir apenas categorias equipaveis: `weapon`, `equipmentitem`, `mount`, `transformationweapon`.
- Exigir `@slottype`. Exigir nome `EN-US`.
- **Nao** filtrar spell por falta de localizacao — fallback para o `uniquename`
  (119 de 710 spells, todas utilitarias tipo `PASSIVE_BACKPACK_*`, nao relevantes para comp).

## Consequencias

**Resultado verificado em dry run contra os dados reais:**

- **2.036 itens emitidos** (era 0), 34 pulados — todos debug/prototype
  (`T4_DEBUG_*`, `UNIQUE_WEAPONMASTER_*_PROTOTYPE`).
- Distribuicao por slot: `mainhand` 817, `shoes` 256, `head` 280, `armor` 264, `cape` 196,
  `offhand` 111, `mount` 100, `bag` 12.
- **1.452 itens com pelo menos uma spell** resolvida.
- `T8_2H_WARBOW` → Q: MULTISHOT2/DEADLYSHOT/POISONARROW; W: GROUNDARROW/JUMPSHOT2/SPEEDSHOT2/
  BURNINGARROWS; E: SKILLSHOT_STUN; 4 passivas. Confere com o jogo.
- `T8_ARMOR_PLATE_SET1` → ativas OUTOFCOMBATHEAL/TAUNT/ENRAGE (slot 1) + 3 passivas slot 1 e
  2 passivas slot 2. Confere com o jogo.

**Custos aceitos:**

- O download cresce (`items.json` raiz somado ao `formatted/items.json`). Ambos ficam sob o TTL de
  7 dias em `.cache/`, entao o custo recorrente e zero.
- Passa a haver dependencia de `spells.json` para *correcao*, nao so para nomes. Se o upstream
  renomear as chaves `activespell`/`passivespell`, tudo vira `active` silenciosamente.
  Mitigacao: assert no pipeline de que `spells.passivespell.length > 0` e falhar alto.
- `@slots` como indice-dentro-do-grupo e uma inferencia do dado, nao documentada pelo upstream.
  Se quebrar, o sintoma sera passivas de armadura no grupo errado, nao saida vazia.

**Guarda-corpo obrigatorio:** o pipeline deve falhar com exit != 0 se emitir menos de 1.500 itens.
O bug original passou despercebido porque emitir 0 itens era sucesso.
