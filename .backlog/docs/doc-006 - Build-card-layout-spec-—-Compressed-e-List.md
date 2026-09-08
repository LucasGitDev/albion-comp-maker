---
id: doc-006
title: Build card layout spec — Compressed e List
type: specification
created_date: '2026-09-07'
---

# Build card layout spec — Compressed (3x3) e List

Task: ACM-073. Consome `src/components/build-card/**` (ACM-013).

## 0. Nota sobre as referências

As três referências pedidas (`albiononline.com/killboard/kill/1445835238`,
`albiononlinegrind.com/builds`, `albiononlinebuilds.com`) retornam **HTTP 403**
para qualquer fetch programático (Cloudflare bot-block, confirmado via `curl`
com UA de browser). A ordem de slots abaixo vem da convenção do *paperdoll*
in-game / killboard oficial, não de leitura direta da página.

**Ação obrigatória do implementer antes de codar**: abrir a URL do killboard no
browser e confirmar a matriz da §2.1. Se divergir, atualizar `KILLBOARD_MATRIX`
e este doc — a matriz é o único ponto do layout que depende de referência
externa; todo o resto (tamanhos, cores, estados) é auto-contido.

## 1. Por que dois layouts

| | Compressed | List |
|---|---|---|
| Trabalho a ser feito | "colar a comp no Discord" | "copiar a build item a item" |
| Densidade | alta (reconhecimento por ícone) | baixa (leitura por nome) |
| Alvo | ~540×400 (preview inline do Discord) | ~480 de largura, altura livre |
| Nome do item | oculto por padrão | sempre visível |
| Padrão convencional | paperdoll do killboard | lista de equipamento |

Não inventamos padrão: o jogador já lê a matriz 3×3 do killboard sem legenda.
Por isso o Compressed **não** rotula os slots ("Cabeça", "Botas") — a posição
já é o rótulo. O List rotula, porque perdeu a posição como significante.

`BuildCardLayout` passa de `"vertical" | "grid"` para
`"vertical" | "grid" | "compressed" | "list"`. `vertical` e `grid` continuam
existindo (ACM-020 e a página de comp dependem deles).

## 2. Layout Compressed

### 2.1 Matriz de slots

```
        col 1        col 2        col 3
row 1 [ bag    ]  [ head   ]  [ cape   ]
row 2 [ mainhand] [ armor  ]  [ offhand]
row 3 [ potion ]  [ shoes  ]  [ food   ]
```

Coluna central = armadura (head/armor/shoes), de cima para baixo, como o corpo.
Laterais = mão principal/secundária na linha do meio, utilidade em cima,
consumível embaixo. `mount` **não entra na matriz** (é o 10º slot e o
killboard também o mostra fora do paperdoll) — vai no painel de meta (§2.5).

```ts
// src/components/build-card/layout-matrix.ts
export const KILLBOARD_MATRIX: readonly (readonly Slot[])[] = [
  ["bag",      "head",  "cape"],
  ["mainhand", "armor", "offhand"],
  ["potion",   "shoes", "food"],
] as const;
```

Teste obrigatório: `KILLBOARD_MATRIX.flat()` + `["mount"]` é uma permutação
exata de `SLOT_ORDER`. Sem isso, um slot novo some do card em silêncio.

### 2.2 Estrutura e medidas

```
┌─ 540 ────────────────────────────────────────────────────┐
│ ▓▓▓ accent 4px ▓▓▓                                       │
│ ┌ p-16 ─────────────────────────────────────────────────┐│
│ │ TANK                                     T8.2 · 1300 ││ 16px
│ │ Guardião do Portão                                    ││ 20px
│ │                                                        ││ 12px
│ │ ┌─ matriz 256 ──┐   ┌─ meta flex-1 ─────────────────┐ ││
│ │ │ [bag][hed][cap]│  │ Montaria                       │ ││
│ │ │  ··   QWEP  QWEP│  │ [icon 40] Cavalo de Guerra T7 │ ││
│ │ │ [mnh][arm][ofh]│  │                                │ ││
│ │ │  QWEP QWEP  QWEP│  │ Swaps                          │ ││
│ │ │ [pot][sho][foo]│  │ • Anti-mobilidade: Bordão       │ ││
│ │ │  ··   QWEP   ·· │  │ • Contra healer: Bruxo         │ ││
│ │ └────────────────┘  └────────────────────────────────┘ ││
│ └────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────┘
```

| Elemento | px |
|---|---|
| Largura total do card | **540** (fixo) |
| Altura | **auto**, alvo ≤ 400; ver orçamento §2.6 |
| Faixa de accent (topo) | altura 4, full-bleed |
| Padding interno | 16 |
| Raio do card | 12 |
| Coluna da matriz | 256 (fixo) |
| Coluna de meta | `flex: 1` → 236 |
| Gap entre colunas | 16 |
| Gap da grade | 8 (col e row) |
| Célula (tile) | 80 × 93 |
| Caixa de ícone do item | 72 × 72, raio 8 |
| Ícone do item | `size="lg"` derivado? **não** — 64px dentro da caixa de 72 (padding 4) |
| Chip de spell | **18 × 18**, raio 3 |
| Gap entre chips de spell | 2 |
| Linha de spells | 4×18 + 3×2 = **78**, centralizada nos 80 da célula |
| Gap ícone → linha de spells | 3 |

```
grid da matriz:
  display: grid
  grid-template-columns: repeat(3, 80px)
  grid-auto-rows: 93px
  gap: 8px
```

Tailwind: `grid grid-cols-[repeat(3,80px)] auto-rows-[93px] gap-2`.

**Altura da célula é fixa em 93px mesmo sem spells.** Bag, food, potion e mount
não têm spells; se a célula encolhesse, as três linhas ficariam desalinhadas e a
matriz deixaria de parecer o paperdoll. A área de spells vira espaço vazio.

### 2.3 Tier badge

Segue o que `CardSlotTile` já faz (não reinventar):
- Tier: canto **inferior-esquerdo** da caixa de ícone, `T8`, `px-1`,
  `font-size: 10px`, `line-height: 14px`, `border-radius: 3px`,
  fundo `tierColor(tier)`, texto `TIER_BADGE_TEXT` (`#0b0d11`).
- Encantamento: canto **inferior-direito**, `.3`, mesmas métricas,
  fundo `CARD_ENCHANT` (`#3f8f4a`), texto `#ffffff`.
- Ambos ocultos quando `tier === 0` / `enchant === 0`.

Em 540px o badge de 10px vira 20px no PNG (`scale: 2`) — legível no Discord.

### 2.4 Spells

Ordem fixa **Q, W, E, Passiva** da esquerda para a direita, sempre. Renderiza
só os grupos que `lookups.spellGroupsByItem[itemId]` expõe, mas **preservando a
posição**: um item sem `W` renderiza um slot vazio de 18px no lugar do W, não
um chip deslocado. Sem isso, a coluna de chips deixa de ser lida por posição e
o usuário precisa de legenda.

- Chip preenchido: ícone da spell, raio 3, sem borda.
- Chip vazio (grupo existe, spell não escolhida): fundo `#1c1f26`,
  borda `1px dashed #3f4552`, raio 3.
- Slot inexistente (item não tem esse grupo): `visibility: hidden`, ocupa 18px.

Nomes de spell **nunca** aparecem no Compressed (`showSpellNames: false`
forçado — 18px não comporta texto). Legenda `Q W E P` em 9px
`CARD_FG_MUTED` fica no topo do painel de meta, uma única vez.

Requer novo token de tamanho de ícone: `xxs: 18` em
`src/components/icons/icon-tokens.ts` (`ICON_SIZE_PX.xxs = 18`,
`ICON_SIZE_CLASS.xxs = "size-[18px]"`). Justificativa: o menor existente é
`xs: 24`; 4×24 + gaps = 102px, o que estoura a célula de 80px e quebraria a
matriz. Não é um tamanho arbitrário — é o maior que cabe em 4 colunas dentro
da célula.

### 2.5 Painel de meta (coluna direita, 236px)

Ordem, de cima para baixo:
1. Legenda `Q W E P` (9px, `CARD_FG_MUTED`) — só se a build tem alguma spell.
2. **Montaria**: rótulo 10px maiúsculo muted + ícone 40px + nome 11px.
   Omitida inteira se `slots.mount === null`.
3. **Swaps**: rótulo + até **3** linhas `• {label}: {nome do item}`, 11px,
   `line-clamp-1`. Se houver mais, a 3ª linha vira `• +N swaps`.
   Omitido inteiro se `swaps.length === 0`.

Se meta e swaps estiverem ambos vazios, o painel some e a matriz **centraliza**
no card (`justify-content: center`), mantendo 540 de largura. Card meio vazio
com uma coluna deslocada para a esquerda parece bug.

### 2.6 Orçamento de altura

```
4   accent
16  padding-top
16  linha de role
4   gap
20  nome da build
12  gap
295 matriz (93*3 + 8*2)
16  padding-bottom
---
383  ≤ 400 ✓
```

Se o nome quebrar em 2 linhas o card vai a 403 — aceitável. `line-clamp-2` no
nome garante o teto.

### 2.7 Estados

| Estado | Renderização |
|---|---|
| **Vazio** (`mainhand === null`) | Matriz completa com as 9 células em placeholder + no lugar do nome: "Sem nome" itálico muted; painel de meta substituído por "Escolha a mão principal para montar a build" (11px, muted). **Não** colapsa o card — o usuário precisa ver a forma que vai preencher (Zeigarnik: a grade incompleta é o gancho). |
| **Slot vazio** | Caixa 72×72, fundo `CARD_SURFACE_2` (`#171a21`), borda `1px dashed #3f4552`, glifo da categoria (`category-glyphs.tsx`) centralizado a 28px com `opacity: 0.28`. Sem tier badge, sem chips de spell. Nunca some da grade. |
| **Loading** | O card não tem loading próprio (props puras). Ícone individual: `use-icon-status` já cobre. |
| **Erro de ícone** | Fallback existente do `ItemIcon` (`--color-icon-error`). O tile continua com tier badge e spells — a build não some por causa de um 404 de imagem. |
| **Sucesso (export)** | Fora do capture root, responsabilidade do `ExportBar`. |

## 3. Layout List

### 3.1 Estrutura

Largura **480**, altura livre. Uma linha por slot, **todos os 10**, em
`SLOT_ORDER` (mainhand primeiro — a arma define a build).

```
┌─ 480 ──────────────────────────────────────────────────┐
│ ▓▓▓ accent 4px ▓▓▓                                     │
│ TANK                                                    │ p-16
│ Guardião do Portão                                      │
│ ──────────────────────────────────────────────────────  │
│ ┌──────────────────────────────────────────────────┐    │
│ │ ┌────┐  MÃO PRINCIPAL                      T8.2  │    │ 64px
│ │ │icon│  Martelo do Juízo                         │    │
│ │ │ 48 │  [Q][W][E][P]                             │    │
│ │ └────┘                                            │    │
│ ├──────────────────────────────────────────────────┤    │
│ │ ┌────┐  MÃO SECUNDÁRIA                     T8.0  │    │
│ │ │icon│  Tomo de Proteção                         │    │
│ │ │    │  [Q][—][—][P]                             │    │
│ │ └────┘                                            │    │
│ ├──────────────────────────────────────────────────┤    │
│ │ ┌╌╌╌╌┐  CAPA                                     │    │ 48px
│ │ ╎ ⛨  ╎  Vazio                                    │    │
│ │ └╌╌╌╌┘                                            │    │
│ └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

| Elemento | px |
|---|---|
| Largura do card | **480** |
| Padding | 16 |
| Altura da linha (com spells) | **64** |
| Altura da linha (sem spells / vazia) | **48** |
| Caixa de ícone | 40 × 40, raio 6 |
| Gap ícone → texto | 12 |
| Rótulo do slot | 9px, `700`, uppercase, `tracking-[0.06em]`, `CARD_FG_MUTED` |
| Nome do item | 13px, `600`, `CARD_FG`, `line-clamp-1` |
| Chip de spell | **24 × 24** (`ICON_SIZE_PX.xs`), gap 4 |
| Pill de tier | à direita, alinhado ao topo da linha |
| Separador | `border-top: 1px solid #22262e` entre linhas, nenhum na primeira |

```
linha: flex items-center gap-3 px-0 py-2
  ícone (shrink-0)
  bloco flex-1 min-w-0: rótulo / nome / spells
  tier pill (shrink-0, self-start)
```

Aqui o tier é **pill textual à direita** (`T8.2`, 11px, fundo `tierColor`,
`px-1.5 rounded`), não badge sobreposto ao ícone: há espaço horizontal e o
badge sobreposto num ícone de 40px cobriria metade do desenho.

Nome do item é **sempre** visível no List (`showItemNames` ignorado). É a razão
de existir do layout — sem nome, o List é só um Compressed pior.

Nome da spell: exibido em 10px muted à direita de cada chip **apenas** se
`theme.showSpellNames` e o item tiver ≤ 2 spells preenchidas; acima disso
estoura 480px. Caso contrário, só os chips.

### 3.2 Estados

| Estado | Renderização |
|---|---|
| **Vazio** (build sem itens) | As 10 linhas em estado "slot vazio" + faixa no rodapé: "Nenhum item equipado ainda — comece pela mão principal." O List mostra o esqueleto completo, é seu diferencial vs. o `vertical` (que descarta slots vazios). |
| **Slot vazio** | Linha de 48px: caixa tracejada `1px dashed #3f4552` com glifo da categoria a 20px `opacity: 0.28`; rótulo do slot normal; no lugar do nome, "Vazio" em itálico `CARD_FG_MUTED`; sem pill de tier; sem chips. |
| **Erro de ícone** | Fallback do `ItemIcon`; linha inteira preservada. |
| **Loading** | N/A (props puras). |

### 3.3 Swaps no List

Bloco após as 10 linhas, separado por `border-top: 1px solid CARD_BORDER` e
`margin-top: 12`. Cabeçalho "SWAPS" (9px uppercase muted) + uma linha por swap
no mesmo formato de linha (ícone 32, label do swap como rótulo). Sem limite de
3 — o List não tem orçamento de altura.

## 4. Cores

Todas as cores vêm de `src/components/build-card/tokens.ts`. **Nenhuma classe
de paleta do Tailwind** dentro de `build-card/**` — elas compilam para
`oklch()` e o `html-to-image` as descarta em silêncio (decision-007).

Reutilizados como estão:

| Token | Hex | Uso |
|---|---|---|
| `CARD_SURFACE` | `#12141a` | fundo do card |
| `CARD_SURFACE_2` | `#171a21` | caixa de ícone / slot vazio |
| `CARD_BORDER` | `#2a2e37` | borda do card |
| `CARD_FG` | `#ECEDEE` | texto primário |
| `CARD_FG_MUTED` | `#9aa1ad` | rótulos, legendas |
| `CARD_ENCHANT` | `#3f8f4a` | badge de encantamento |
| `TIER_BADGE_TEXT` | `#0b0d11` | texto do tier badge |
| `TIER_COLORS[4..8]` | `#557e98` `#934038` `#d8894c` `#e8c95f` `#d9d9e3` | tier |
| `TIER_COLOR_LOW` | `#6b7280` | tier ≤ 3 |
| `ROLE_ACCENTS` | tank `#4a8fd4` / healer `#3f8f4a` / dps `#c8452f` / support `#a86fd4` | faixa de accent |

Novos em `tokens.ts` (dois, ambos necessários e ambos já existem como
`@theme` em `globals.css` — replicados aqui porque `build-card/**` não importa
tokens CSS, ver comentário do arquivo):

| Token | Hex | Justificativa |
|---|---|---|
| `CARD_SLOT_EMPTY_BORDER` | `#3f4552` | borda tracejada do slot vazio; `CARD_BORDER` (`#2a2e37`) some contra `CARD_SURFACE_2` e o estado vazio deixa de ser visível |
| `CARD_ROW_DIVIDER` | `#22262e` | separador entre linhas do List; `CARD_BORDER` é forte demais repetido 10× e vira uma grade listrada |

`CARD_PLACEHOLDER` (`#2a2e37`) já existe e continua sendo o fill do glifo.

## 5. Componentes

| Componente | Situação | Nota |
|---|---|---|
| `BuildCard` | **alterar** | aceitar `layout: "compressed" \| "list"` |
| `ItemIcon`, `SpellIcon` | reusar | sem mudança |
| `tokens.ts` | **alterar** | +2 tokens (§4) |
| `icon-tokens.ts` | **alterar** | `+xxs: 18` (§2.4) |
| `category-glyphs.tsx` | reusar | glifo do slot vazio |
| `CardSlotTile` | **não usar** | 80px com rótulo textual e altura variável; o Compressed precisa de altura fixa e sem rótulo |
| `SpellRow` | **não usar no Compressed** | não preserva posição de grupo ausente (§2.4) nem suporta 18px |
| `BuildCardCompressed` | **novo** | justificativa: matriz posicional de altura fixa, sem rótulo de slot, com painel de meta — não é parametrização do `BuildCardVertical`, é outra estrutura |
| `CompressedTile` | **novo** | tile 80×93 de altura fixa que renderiza slot vazio (o `CardSlotTile` só renderiza slot preenchido) |
| `SpellStrip` | **novo** | faixa de 4 posições fixas com placeholder para grupo ausente; substitui `SpellRow` no Compressed |
| `BuildCardList` | **novo** | linhas horizontais com nome sempre visível |
| `ListRow` | **novo** | linha de 64/48px |

`SpellRow` e `CardSlotTile` continuam intactos — `vertical` e `grid` dependem
deles e não estão no escopo desta task.

## 6. Verificação manual

1. Editor com build completa (10 slots) → alternar para Compressed → exportar
   PNG → conferir 1080×~766 (`scale: 2`) e que a matriz bate com a §2.1.
2. Build vazia → Compressed mostra 9 placeholders tracejados, não colapsa.
3. Build só com mainhand → List mostra 10 linhas, 9 delas "Vazio".
4. Item com só Q e passiva → chips Q e P nas posições 1 e 4, posições 2 e 3
   vazias e alinhadas.
