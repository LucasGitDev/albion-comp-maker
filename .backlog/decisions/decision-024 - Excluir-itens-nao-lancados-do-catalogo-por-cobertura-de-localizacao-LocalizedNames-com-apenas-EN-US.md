---
id: decision-024
title: >-
  Excluir itens nao-lancados do catalogo por cobertura de localizacao
  (LocalizedNames com apenas EN-US)
date: '2026-09-09 01:24'
status: accepted
---
## Context

O emitter (`scripts/sync-ao-data.ts`) nao filtra conteudo nao-lancado. Tres itens
do set Dragonknight — `T8_HEAD_PLATE_PROTOTYPE`, `T8_ARMOR_PLATE_PROTOTYPE`,
`T8_SHOES_PLATE_PROTOTYPE` — entraram em `src/data/ao-data.json` e aparecem no
item-picker. Usuarios conseguem montar comps com itens que nao existem no jogo.
Descoberto na review da ACM-091; e comportamento pre-existente do pipeline.

O criterio de exclusao nao pode ser substring de `uniquename` (`/PROTOTYPE/`):
e um acidente de nomenclatura da SBI, nao um contrato. O proximo set nao-lancado
pode se chamar `_WIP`, `_TEST`, ou nada disso.

Medicoes feitas sobre o dump `ao-data/ao-bin-dumps@master` baixado em 2026-09-08,
contra os 2142 itens atualmente emitidos.

## Opcoes consideradas

### A. Flags do XML de origem (`@unlockedtocraft`, `@unlockedtoequip`, `@showinmarketplace`)

**Rejeitada — os flags sao invertidos em relacao a hipotese.** Os tres prototipos
tem `true` em todos os tres flags, enquanto centenas de itens legitimos tem `false`:

| Predicado sobre os 2142 itens emitidos | Itens que seriam removidos |
|---|---|
| `@unlockedtocraft !== "true"` | 1545 |
| `@unlockedtoequip !== "true"` | 1584 |
| `@showinmarketplace !== "true"` | 1246 |
| `craftingrequirements` ausente | 274 |

Comparacao direta, prototipo vs. item valido do mesmo slot/tier:

```
T8_HEAD_PLATE_PROTOTYPE  craft=true  equip=true  market=true  hasCraftReq=true
T8_HEAD_PLATE_SET3       craft=false equip=false market=true  hasCraftReq=true
```

Qualquer um desses flags removeria ~58-74% do catalogo **e ainda assim manteria os
prototipos**. Esses campos descrevem o estado de progressao/destravamento do
jogador, nao o estado de lancamento do conteudo.

### B. `LocalizedDescriptions === null`

**Rejeitada — 299 falsos positivos.** Pega os 3 prototipos, mas tambem 296 itens
vanity legitimos e de longa data (`UNIQUE_HEAD_VANITY_KNIGHT`,
`UNIQUE_ARMOR_VANITY_PALADIN`, todo o set Founder, etc). A descricao e opcional
por design para cosmeticos.

### C. Ausencia especifica de `PT-BR` em `LocalizedNames`

Funciona hoje (remove exatamente os 3), mas amarra a regra a um unico locale de
mercado. Se a SBI lancar um item com traducao parcial que exclua PT-BR, o item
some do catalogo em ambos os idiomas. E o caso degenerado da opcao D.

### D. Cobertura de localizacao: `LocalizedNames` com menos de 2 locales *(escolhida)*

O pipeline de localizacao da SBI e all-or-nothing: quando um item e efetivamente
lancado, o nome e traduzido para os 15 locales de uma vez. A distribuicao de
`Object.keys(LocalizedNames).length` sobre o corpus inteiro (12237 itens de
`formatted/items.json`) e estritamente bimodal:

| locales | itens |
|---|---|
| 0  | 846 |
| 1  | 19 |
| 15 | 11372 |

**Nao existe nenhum item com 2 a 14 locales.** Nao ha gradiente, logo qualquer
limiar nessa faixa e equivalente e nao ha zona cinzenta onde um falso positivo
possa surgir.

Os 19 itens com exatamente 1 locale sao:
- 15 variantes de prototipo: `T8_{HEAD,ARMOR,SHOES}_PLATE_PROTOTYPE` mais os
  sufixos de encantamento `@1`..`@4` de cada;
- 4 avatares de temporada GvG (`UNIQUE_AVATAR_GVGSEASON_3{0,1}_{CRYSTAL,SILVER}_SINGLE`),
  que ja sao excluidos antes por nao pertencerem a `EMITTED_CATEGORIES`.

Os 846 itens com 0 locales ja sao descartados pelo guard existente
`if (!names || !names["EN-US"])`.

## Decisao

Um item so entra no catalogo se `LocalizedNames` (de `formatted/items.json`)
contiver **pelo menos 2 locales**, ou seja, se estiver localizado alem do
`EN-US` de autoria. Itens com apenas `EN-US` sao tratados como conteudo
nao-lancado (datamined/prototipo) e descartados.

Implementado como predicado puro exportado `isReleasedItem(item)` em
`scripts/sync-ao-data.ts`, aplicado em `buildItemNameIndex`. O predicado avalia
o objeto `LocalizedNames` **completo**, antes do estreitamento para
`TARGET_LOCALES` (`EN-US`, `PT-BR`) — avaliar depois do estreitamento tornaria a
regra identica a opcao C.

**Efeito medido:** remove exatamente 3 itens dos 2142 emitidos —
`T8_HEAD_PLATE_PROTOTYPE`, `T8_ARMOR_PLATE_PROTOTYPE`, `T8_SHOES_PLATE_PROTOTYPE`.
Zero falsos positivos. Novo total: 2139 itens.

## Consequences

- **Positivo:** criterio semantico e independente de nomenclatura; nao usa
  substring de `uniquename` (AC-2 da ACM-094). Sets nao-lancados futuros sao
  filtrados automaticamente, sem manutencao de lista.
- **Positivo:** `PROTOTYPE_ICESHIELD` deixa de ser alcancavel pela UI — nenhum
  item emitido o referencia mais. O registro `spells` do artefato continua
  contendo todos os spells de `spells.json` (e uma tabela de lookup, nao um
  catalogo); nao ha mudanca de escopo ali.
- **Negativo / risco aceito:** se a SBI mudar o processo e lancar conteudo com
  traducao incremental (ex.: EN + DE primeiro), itens legitimos ficariam de fora
  por ate um ciclo de traducao. Mitigacao: a bimodalidade estrita torna esse
  cenario detectavel — o aparecimento de qualquer item na faixa 2..14 locales e o
  sinal de que esta decisao precisa ser revisitada.
- **Colateral obrigatorio:** os numeros fixados em `src/__tests__/acceptance.test.ts`
  (AC-3) sao snapshots manuais e precisam ser rebaixados junto:
  total 2142 -> 2139, withSpells 1455 -> 1452, `head` 281/191 -> 280/190,
  `armor` 265/181 -> 264/180, `shoes` 257/180 -> 256/179. Os tres prototipos tem
  spells (6, 7 e 7 respectivamente), por isso `withSpells` tambem cai.
- **Colateral obrigatorio:** `src/data/ao-data.json` (versionado, decision-023) e
  `src/__tests__/fixtures/ao-corpus.json` precisam ser regerados
  (`pnpm sync:ao && pnpm build:fixture`).
- O guard-rail `MIN_ITEMS = 1500` continua cobrindo o cenario de colapso: se
  `LocalizedNames` mudar de forma upstream e todos os itens passarem a parecer
  nao-lancados, o emit falha em vez de emitir catalogo vazio.
