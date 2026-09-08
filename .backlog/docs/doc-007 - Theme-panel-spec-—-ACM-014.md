---
id: doc-007
title: Theme panel spec — ACM-014
type: specification
created_date: '2026-09-07'
---

# Theme panel spec — ACM-014

Spec de UI/UX. Nenhum código aqui — estrutura, hierarquia, estados, copy real,
tokens. Desktop-first.

Lido antes de escrever: doc-003 (princípios do redesign), doc-004 (header +
action bar + z-scale + regras de 390px), doc-006 (build card Compressed/List —
é o que este painel controla), `src/components/build-card/tokens.ts`,
`src/components/build-card/types.ts` (`BuildCardTheme` atual),
`src/app/globals.css`, `src/app/(editor)/build/new/page.tsx`,
`src/lib/validation-constants.ts`, notas de ACM-029/ACM-042.

---

## 0. Decisões que governam o resto

**D1 — O painel de tema NÃO é uma tela nova nem um modal.** Todo controle aqui
tem efeito visual imediato no card. Um modal que cobre o card obriga o usuário
a fechar/abrir para ver o resultado — isso transforma "escolher um tema" em
loop de tentativa e erro. O painel vive **ao lado do preview**, sempre.
Mecanismo: *feedback loop imediato* — reduz o custo percebido de experimentar,
e experimentar é o que faz o usuário chegar num card que ele tem orgulho de
colar no Discord (que é o momento de conversão do produto).

**D2 — Tema é ação terciária.** doc-004/D2 já fixou: "Salvar" é primária,
"Exportar PNG" é secundária. O gatilho do painel (`Aparência`) é um botão
**ghost com ícone + rótulo**, na action bar, à esquerda de "Exportar PNG".
Nunca accent. Três botões accent na action bar = nenhuma ação primária.

**D3 — O painel é irmão do `#capture-root`, nunca descendente.** Mesma
invariante de doc-004 §6. O painel escreve em `theme_json` no store; o
`BuildCard` lê. Nenhum nó de controle entra no clone do `html-to-image`.

**D4 — Todo valor de cor que o painel produz é hex literal de 6 dígitos.**
Presets são objetos de hex (§5), não nomes de classe Tailwind. O input de
accent valida contra `ACCENT_HEX_PATTERN` (`src/lib/validation-constants.ts`) —
o mesmo regex do write-side (ACM-054). Não introduzir `var()` novo dentro de
`build-card/**`: o guard de ACM-029 **não resolve custom properties**, então um
`var()` apontando para `oklch()` passa despercebido e some do PNG em silêncio.
Esta é a task com maior probabilidade de quebrar o export — ver nota da ACM-014.

**D5 — Mexer em qualquer controle depois de escolher um preset converte o
seletor para `custom` automaticamente.** Detalhe em §9.

---

## 1. Onde o painel vive

### 1.1 Justificativa contra o chrome existente (doc-004)

O editor já tem: header global (`z-30`, 56px), breadcrumb, action bar sticky
(`z-20`, `top: var(--header-h)`), grade de slots, seção de swaps, e o wrapper
de preview (`previewContainerRef`, hoje ainda não populado na rota
`/build/new`). Opções avaliadas:

| Opção | Por quê não |
|---|---|
| Seção da action bar | A barra já carrega estado de save + 2 botões. Somar ~9 controles ali destrói a leitura de 2 segundos e derruba o único `aria-live` da barra num mar de widgets. |
| Aba ("Editar" / "Aparência") | Esconde a grade de slots enquanto o usuário ajusta o tema. Mas o tema só faz sentido com a build montada; e abas criam um segundo nível de navegação que doc-004 §3 evitou de propósito. |
| Popover ancorado | Comporta 3 controles, não 9 + upload + sliders. Popover com scroll interno é drawer disfarçado. |
| Modal | Cobre o preview. Viola D1. |
| **Rail lateral direito (dock)** | **Escolhido.** Convive com o preview, não rouba o topo, não compete com a action bar, e é o padrão que o usuário já conhece de qualquer editor visual (Figma, Canva). Não inventar padrão onde existe convenção. |

### 1.2 Três formas do mesmo painel

| Viewport | Forma | Comportamento |
|---|---|---|
| **≥ 1280px** | Rail **persistente** à direita, largura **320px**, `position: sticky`, `top: calc(var(--header-h) + 56px)` (header + action bar), `max-height: calc(100vh - var(--header-h) - 56px - 16px)`, `overflow-y: auto`. O conteúdo do editor ocupa a coluna restante. | Aberto por padrão. Botão `Aparência` na action bar vira toggle com `aria-expanded`; fechado, o rail colapsa e a coluna de conteúdo reflui. Preferência persiste em `localStorage` (`acm.themePanel.open`). |
| **768–1279px** | **Slide-over** ancorado à direita, largura **360px**, `z-40` (faixa "painéis" da escala de doc-004 §5.4). Empurra o conteúdo (não sobrepõe): `main` ganha `padding-right: 360px` enquanto aberto. | Fechado por padrão. Abre pelo botão `Aparência`. Fecha com `Esc`, com o `×` do cabeçalho e com clique fora. Foco entra no primeiro controle; ao fechar, volta ao botão `Aparência`. **Não é focus-trap** — é um dock não-modal; o usuário pode tabular de volta pro editor. |
| **< 768px (390px)** | **Bottom sheet** modal, `height: 72vh`, `inset-x-0 bottom-0`, `z-40`, com **mini-preview fixo** de 148px colado no topo da sheet. | Ver §1.3. |

Nada aqui altera header nem action bar. O rail é irmão do `<main>` grid, não um
ancestral posicionado do preview (D3, doc-004 §6.3).

### 1.3 390px — regras anti-overflow (obrigatórias)

O projeto já tem ACM-041/doc-005 tratando overflow em 390px. Este painel não
pode somar um bug novo:

1. **Sheet é modal.** Enquanto aberta, a action bar fixa de rodapé recebe
   `inert` + `aria-hidden="true"` e é **visualmente ocultada**. Motivo: duas
   barras fixas + sheet = ~160px de 844px consumidos e alvos de toque
   sobrepostos. A sheet tem a sua própria ação de fechamento: `[ Concluir ]`,
   full-width, no rodapé da sheet.
2. **Zero scroll horizontal.** Coluna única. `box-sizing: border-box` com
   `padding-inline: 16px`. Todo controle é `width: 100%`, `min-width: 0`.
   Nenhuma linha de chips com `overflow-x`. Os 5 presets ficam em grade
   **2 colunas** (`grid-cols-2`, último item ocupa 1 coluna) — não em faixa
   rolável.
3. **Nenhum `min-width` fixo maior que 358px** (390 − 2×16) em qualquer
   descendente. O segmented control de aspect ratio usa `grid-cols-3` com
   `flex-1`, não largura fixa.
4. Sliders: rótulo em cima, valor à direita do rótulo, trilha full-width
   embaixo. Nunca rótulo e trilha na mesma linha em <768px — é a causa clássica
   de estouro.
5. Alvo de toque ≥ 44×44 no thumb do slider, nos cards de preset e no
   `Concluir`.
6. A sheet **não** usa `100vh` (barra de URL do Safari): `72vh` + `max-height:
   calc(100dvh - 72px)` e `padding-bottom: env(safe-area-inset-bottom)`.

### 1.4 Fluxo (desktop)

1. Usuário monta a build → clica `Aparência` na action bar (1 clique).
2. Rail abre já em "Preset" → clica num preset → **o preview muda na hora**.
3. Ajusta o que quiser (accent, fundo, toggles, formato). Cada ajuste reflete
   em < 100ms no preview.
4. Fecha o rail (ou nem fecha) → `Salvar`. O tema faz parte do `theme_json` do
   build; **não existe botão "Aplicar tema"** — não há estado intermediário a
   confirmar. Um "Aplicar" separado criaria a dúvida "eu já apliquei?".
5. Errou → `Desfazer` (§9.3) ou trocar de preset. Nada é destrutivo exceto
   remover a imagem de fundo, que tem confirmação inline (§6.4).

Máximo de passos para "trocar o visual do card": **2 cliques** (Aparência →
preset).

---

## 2. Hierarquia e agrupamento

São 11 controles. Agrupados em 4 blocos, do mais decisivo para o mais fino —
ordem de *impacto visual decrescente*, que é como o usuário procura:

| # | Grupo | Controles | Colapsável? |
|---|---|---|---|
| 1 | **Preset** | 5 cards (dark-purple, gold, blood, ice, custom) | Não. Sempre visível. É a decisão que resolve 80% dos casos em 1 clique. |
| 2 | **Fundo** | upload de imagem + blur + escurecer + escala | Sim, **aberta por padrão**. É o único grupo com fluxo de várias etapas. |
| 3 | **Cores e tipografia** | cor de accent, fonte | Sim, **fechada por padrão**. Ajuste fino; o preset já definiu um accent bom. |
| 4 | **Conteúdo e formato** | mostrar nomes de item, mostrar nomes de spell, proporção | Sim, **fechada por padrão**. |

Regras:
- Cada grupo colapsável é um `<details>`/disclosure real com `<summary>`
  (`<h3>` dentro), `aria-expanded`, e **resumo do estado atual à direita do
  título quando fechado** — `Fundo · imagem, blur 6` / `Cores · #e8823c, Inter`
  / `Conteúdo · nomes ocultos, Quadrado`. Sem isso, o usuário abre os 3 grupos
  toda vez só pra descobrir onde está o que ele quer. Esse resumo é o que
  substitui o "scroll infinito".
- Estado aberto/fechado de cada grupo persiste em `localStorage`.
- Altura do painel com grupos 3 e 4 fechados: ~560px → **cabe sem scroll** num
  viewport de 900px com o rail em `top: 112px`. Só o grupo 2 expandido com
  imagem carregada força scroll, e aí o scroll é curto e local.

---

## 3. Wireframe

### 3.1 Desktop ≥1280px — layout da rota

```
┌ header global ─────────────────────────────────────────────────── 56px, z-30 ┐
├──────────────────────────────────────────────────────────────────────────────┤
│ ← Minhas comps  ›  Nova build                                                │
├─ action bar ────────────────────────────── sticky top:var(--header-h), z-20 ─┤
│  Bruiser de frontline · 3/9 slots                                            │
│                        [ ▦ Aparência ]  [ Exportar PNG ]  [   Salvar   ]     │
│                          ghost, toggle    ghost            PRIMÁRIA          │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌ conteúdo do editor (flex-1, min-w-0) ──────────┐ ┌ rail de tema — 320px ──┐│
│ │                                                │ │ ▲ sticky top:112px     ││
│ │  ┌ preview (#capture-root vive aqui dentro) ─┐ │ │                        ││
│ │  │            [ BuildCard ]                  │ │ │  Aparência         [×] ││
│ │  └───────────────────────────────────────────┘ │ │  ────────────────────  ││
│ │                                                │ │  ...  (§3.2)           ││
│ │  Identidade da build                           │ │                        ││
│ │  Armas / Armadura / Consumíveis (grade)        │ │                        ││
│ │  Swaps                                         │ │                        ││
│ └────────────────────────────────────────────────┘ └────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
       gap 24px entre coluna de conteúdo e rail
```

### 3.2 Conteúdo do painel (320px de largura, padding-inline 16px → 288px úteis)

```
┌ 320 ─────────────────────────────────────────────┐
│ ┌ 16 ─┐                                    ┌ 16 ┐│
│  Aparência                              [ × ]    │  header 48px, border-b
│ ──────────────────────────────────────────────── │
│                                                  │
│  PRESET                                          │  11px, 700, uppercase, muted
│  ┌──────────────┐ ┌──────────────┐               │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓ │               │  swatch 100×28, radius 6
│  │ Roxo escuro  │ │ Dourado      │               │  12px, 600
│  └──────────────┘ └──────────────┘               │  card 138×62, gap 12
│  ┌──────────────┐ ┌──────────────┐               │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓ │ │ ▓▓▓▓▓▓▓▓▓▓▓▓ │               │
│  │ Sangue       │ │ Gelo       ✓ │               │  ✓ = selecionado
│  └──────────────┘ └──────────────┘               │
│  ┌──────────────┐                                │
│  │  ✎  perso…   │  Personalizado                 │  só selecionável
│  └──────────────┘                                │  indiretamente (§9)
│                                                  │
│ ──────────────────────────────────────────────── │
│  ▾ Fundo                                         │  summary 40px
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │            ⬆                               │  │  dropzone 288×112
│  │   Arraste uma imagem ou clique             │  │  border 1px dashed
│  │   JPEG, PNG ou WebP · até 4 MB             │  │  radius 8
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Desfoque                                  0 px  │  14px label / 13px valor
│  ●───────────────────────────────────────────    │  trilha 288, thumb 20
│                                                  │
│  Escurecer                                  40 % │
│  ─────────────●───────────────────────────────   │
│                                                  │
│  Escala                                    100 % │
│  ●───────────────────────────────────────────    │
│                                                  │
│ ──────────────────────────────────────────────── │
│  ▸ Cores e tipografia    #6fb7d4 · Inter         │  fechado, com resumo
│ ──────────────────────────────────────────────── │
│  ▸ Conteúdo e formato    nomes ocultos · Quadrado│
│ ──────────────────────────────────────────────── │
│                                                  │
│  Desfazer alteração de tema                      │  link 13px, só após mudança
│                                                  │
└──────────────────────────────────────────────────┘
```

Grupo 3 expandido:

```
│  ▾ Cores e tipografia                            │
│                                                  │
│  Cor de destaque                                 │  14px
│  ┌────┐ ┌──────────────────────┐                 │
│  │ ▓▓ │ │ #6FB7D4              │                 │  swatch 36×36 (abre
│  └────┘ └──────────────────────┘                 │  <input type=color>)
│  ○ ○ ○ ○ ○ ○                                     │  6 atalhos: os 4 accents
│                                                  │  de preset + 2 role accents
│  Fonte                                           │
│  ┌────────────────────────────────────────────┐  │
│  │ Inter (padrão)                          ▾  │  │  select nativo, 40px
│  └────────────────────────────────────────────┘  │
│  Aa Bb Cc — Guardião do Portão                   │  amostra 15px na fonte
```

Grupo 4 expandido:

```
│  ▾ Conteúdo e formato                            │
│                                                  │
│  Mostrar nomes de item                    [ ○──] │  switch 44×24
│  Mostrar nomes de habilidade              [──●]  │
│                                                  │
│  Proporção                                       │
│  ┌──────────┬──────────┬──────────┐              │  segmented, 40px,
│  │ Quadrado │  Largo   │ Automát. │              │  radiogroup
│  └──────────┴──────────┴──────────┘              │
│  1080 × 1080 px no PNG exportado                 │  12px muted, reativo
```

### 3.3 390px — bottom sheet

```
┌ 390 ─────────────────────────────────────┐
│  … conteúdo do editor (scroll)           │
│                                          │
├─ sheet, z-40, 72vh ──────────────────────┤
│                ▂▂▂▂                      │  grabber 36×4
│  Aparência                        [ × ]  │  48px
│ ┌ mini-preview 358×148, contain ────────┐│  sticky no topo da sheet
│ │        [ BuildCard escalado ]         ││  scale-to-fit, aria-hidden
│ └───────────────────────────────────────┘│  (é espelho, não o capture root)
│ ──────────────────────────────────────── │
│  PRESET                                  │  ↓ área rolável
│  ┌────────────┐ ┌────────────┐           │
│  │ Roxo escuro│ │ Dourado    │           │  grid-cols-2, 171px cada
│  └────────────┘ └────────────┘           │
│  ┌────────────┐ ┌────────────┐           │
│  │ Sangue     │ │ Gelo     ✓ │           │
│  └────────────┘ └────────────┘           │
│  ┌────────────┐                          │
│  │ Personaliz.│                          │
│  └────────────┘                          │
│  ▾ Fundo                                 │
│  …                                       │
│ ──────────────────────────────────────── │
│  [           Concluir             ]      │  full-width 48px, ghost+border
└──────────────────────────────────────────┘   + env(safe-area-inset-bottom)
```

**Mini-preview:** é um segundo render do `BuildCard` com os mesmos props,
dentro da sheet, marcado `aria-hidden="true"` e **sem** `id="capture-root"`
(um `id` duplicado quebraria `resolveCaptureNode` do `ExportBar` em silêncio —
isso é um teste obrigatório). Escala por `transform: scale()` num wrapper com
`overflow: hidden`; nunca por largura de card, que é fixa em 540/480 por
doc-006.

---

## 4. Componentes

| Componente | Novo? | Justificativa |
|---|---|---|
| `ThemePanel` | **novo** | Container das 3 formas (rail / slide-over / sheet). Uma implementação, 3 apresentações via CSS — não 3 componentes. |
| `ThemePresetGrid` | **novo** | Radiogroup com swatch composto (4 faixas de cor). Não é `select`: a decisão é visual, e um `<select>` de "Dourado/Sangue" força o usuário a traduzir nome→aparência. |
| `ThemeDisclosure` | **novo, mínimo** | `<details>` estilizado com slot de resumo à direita. Reutilizável; não trazer lib de accordion. |
| `BackgroundDropzone` | **novo** | Upload + drag&drop + preview + estados de erro. Não existe equivalente. |
| `LabeledSlider` | **novo** | `input[type=range]` com label, `<output>` e formatação de unidade. Três usos nesta task. |
| `SegmentedControl` | **novo** | Radiogroup horizontal. 3 opções mutuamente exclusivas com rótulo curto — `SlotGroupNav` tem chips parecidos mas é navegação por âncora, semântica diferente; não forçar reuso. |
| `Switch` | **novo** | `input[type=checkbox]` com aparência de switch. Dois usos. |
| `Aparência` (botão) | **alterar** `EditorActionBar` | Ganha 3º botão ghost com `aria-expanded`/`aria-controls`. |
| `BuildCard` / `tokens.ts` | **alterar** | `BuildCardTheme` cresce (§10). `resolveAccent` já existe e continua sendo o único caminho de accent. |
| `SlotPickerPopover` | reusar padrão | Comportamento de Esc / clique-fora / retorno de foco do slide-over copia o que já existe ali. Não introduzir lib de dialog. |

---

## 5. Os 4 presets (hex literal)

Cada preset é um objeto congelado em `src/components/build-card/theme-presets.ts`
(dentro de `build-card/**`, junto de `tokens.ts` — é dado do card, não do chrome).
**Nenhum nome de cor Tailwind. Nenhum `var()`. Nenhum `oklch()`.**

Cada preset define 6 valores: `surface`, `surface2`, `border`, `accent`,
`accentFg`, `fg`, `fgMuted`. O que **não** muda por preset: `TIER_COLORS`,
`CARD_ENCHANT`, `TIER_BADGE_TEXT` — tier e encantamento são semântica do jogo,
não decoração; recolorir tier por tema faria o card mentir.

### 5.1 dark-purple (padrão)

| Token | Hex | Uso no card (doc-006) |
|---|---|---|
| `surface` | `#16121f` | fundo do card |
| `surface2` | `#1e1830` | caixa de ícone, slot vazio |
| `border` | `#342a4a` | borda do card, divisórias |
| `accent` | `#a86fd4` | faixa de 4px do topo, pill de papel |
| `accentFg` | `#14101c` | texto sobre accent |
| `fg` | `#ECEDEE` | nome da build, nome do item |
| `fgMuted` | `#a79bbd` | rótulos, legenda Q W E P |

Continuidade: `#a86fd4` é exatamente o `ROLE_ACCENTS.support` já existente.

### 5.2 gold

| Token | Hex |
|---|---|
| `surface` | `#1a1710` |
| `surface2` | `#241f16` |
| `border` | `#463a23` |
| `accent` | `#e8c95f` |
| `accentFg` | `#14171d` |
| `fg` | `#F3EFE4` |
| `fgMuted` | `#b3a582` |

Continuidade: `#e8c95f` é o `--color-tier-7` já existente. Não é colisão
problemática — o badge de tier vive sobre `surface2` e tem texto próprio; mas o
implementer deve conferir visualmente um card T7 sob o preset gold (item 5 da
verificação manual, §12).

### 5.3 blood

| Token | Hex |
|---|---|
| `surface` | `#1a1113` |
| `surface2` | `#25171a` |
| `border` | `#4a2529` |
| `accent` | `#d9543c` |
| `accentFg` | `#1a1113` |
| `fg` | `#F2E8E6` |
| `fgMuted` | `#b89b98` |

`#d9543c` é uma versão clareada do `ROLE_ACCENTS.dps` (`#c8452f`) — o original
não atinge 4,5:1 com nenhum texto sobreposto. `ROLE_ACCENTS.dps` permanece
inalterado (é o default por papel, não um preset).

### 5.4 ice

| Token | Hex |
|---|---|
| `surface` | `#101820` |
| `surface2` | `#17212c` |
| `border` | `#27384a` |
| `accent` | `#6fb7d4` |
| `accentFg` | `#0b1218` |
| `fg` | `#E6F0F5` |
| `fgMuted` | `#94a9b8` |

### 5.5 Invariantes de contraste (verificáveis em teste)

Regra transversal: **todo preset usa `accentFg` escuro**. Os quatro accents têm
luminância média/alta; texto claro sobre eles fica abaixo de 4,5:1. Uma regra
única evita o bug de "só o dourado tem texto preto".

Teste obrigatório (`theme-presets.test.ts`), para cada preset:
1. `contrast(fg, surface) ≥ 7:1`
2. `contrast(fgMuted, surface) ≥ 4.5:1`
3. `contrast(fgMuted, surface2) ≥ 4.5:1`
4. `contrast(accentFg, accent) ≥ 4.5:1`
5. `contrast(border, surface) ≥ 1.5:1` (a borda precisa ser vista)
6. Todo valor casa `/^#[0-9a-fA-F]{6}$/` — nenhum `oklch`, `oklab`,
   `color-mix`, `rgb()`, alpha-slash, nem nome de classe Tailwind.

O item 6 é o teste que impede a regressão descrita nas notas da ACM-014.

### 5.6 Preset ≠ cor do chrome

Os presets pintam **só o card**. O rail, a action bar e o header continuam nos
tokens de `globals.css` (`--color-surface` `#14171d`, `--color-accent`
`#e8823c`). Um editor que muda de cor inteira a cada preset dá a impressão de
que o app quebrou, e o usuário perde a referência neutra para julgar o card.

---

## 6. Fluxo do upload de background

Contrato (AC#1/AC#2): 4 MB máx., JPEG/PNG/WebP, redimensionado no servidor para
2000px no maior lado via `sharp`, gravado como WebP, `theme_json` guarda o
**path**, nunca dataURL.

### 6.1 Estados do dropzone

**A. idle (sem imagem)**
```
┌────────────────────────────────────────────┐
│                  ⬆                         │  ícone 24px, muted
│      Arraste uma imagem ou clique          │  14px, fg
│      JPEG, PNG ou WebP · até 4 MB          │  12px, muted
└────────────────────────────────────────────┘
   border: 1px dashed var(--color-icon-slot-empty)  #3f4552
   background: var(--color-icon-slot)               #1c1f26
```
É um `<button>` que dispara um `<input type="file" class="sr-only">`. Botão,
não `<div onClick>` — teclado e leitor de tela dependem disso.
Sliders do §7 aparecem **desabilitados**, com `aria-disabled` e a nota
`Envie uma imagem para ajustar` (12px muted) abaixo do grupo. Não escondê-los:
o usuário precisa saber que existem, senão o valor do upload não é óbvio.
Mecanismo: *goal gradient* — mostrar o que se destrava.

**B. arrastando (`dragover`)**
Borda vira `1px solid` na cor accent do chrome (`var(--color-accent)`), fundo
`#1f232b`, copy troca para `Solte para enviar`. Sem animação de escala — o
painel é ferramenta, não vitrine. `dragleave`/`drop` restauram.

**C. enviando**
```
┌────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░  62%          │  barra 4px, accent
│  Enviando imagem…                          │
└────────────────────────────────────────────┘
```
`role="status" aria-live="polite"`, mas o texto anunciado é só
`Enviando imagem` (o número não é reanunciado a cada tick — spam de leitor de
tela). Cancelável: link `Cancelar` à direita, que aborta o request. Enquanto
envia, `Salvar` e `Exportar PNG` **não** são bloqueados — o upload é
independente da build.

**D. sucesso**
```
┌────────────────────────────────────────────┐
│ ┌────────┐  fundo-batalha.webp             │  miniatura 72×48, object-cover
│ │ thumb  │  1920 × 1080 · 340 KB           │  12px muted
│ └────────┘  [ Trocar ]      [ Remover ]    │  2 links 13px
└────────────────────────────────────────────┘
```
Dimensões mostradas são as **pós-resize do servidor** (é o que vai pro PNG), não
as do arquivo original. Sliders habilitam. Zona continua aceitando drop para
substituir. Anúncio: `Imagem de fundo aplicada.`

**E. erro**
A mensagem aparece **dentro do dropzone**, substituindo a copy de idle, com
borda `1px solid var(--color-icon-error-fg)` e texto
`var(--color-icon-error-fg)` (`#f87171`). Nunca um toast: toast some antes de o
usuário entender o que fazer, e a ação corretiva é bem ali.

| Causa | Copy | Ação de recuperação |
|---|---|---|
| Arquivo > 4 MB | `Essa imagem tem 7,2 MB. O limite é 4 MB.` | `Escolher outra` (reabre o file picker) |
| Tipo inválido | `Formato não suportado. Use JPEG, PNG ou WebP.` | `Escolher outra` |
| Vários arquivos soltos | `Solte só uma imagem.` | zona volta a idle |
| Falha de rede / 5xx | `Não deu para enviar. Verifique a conexão.` | `Tentar de novo` (reenvia o mesmo arquivo, sem re-selecionar) |
| Servidor rejeitou (`sharp` falhou / arquivo corrompido) | `Não conseguimos processar essa imagem.` | `Escolher outra` |

Validação de tamanho e tipo acontece **no cliente antes do upload** (feedback em
<50ms, sem gastar upload) **e no servidor** — a do cliente é UX, a do servidor é
a de verdade. O erro não auto-reseta; some na próxima tentativa. Se já existia
uma imagem, **ela é preservada** em caso de erro: o card nunca perde o fundo por
causa de um upload falho.

### 6.2 Remover / trocar

- `Trocar` = abre o file picker; o fluxo recomeça em C. A imagem antiga só sai
  no sucesso da nova.
- `Remover` = ação destrutiva, exige um passo:
  ```
  Remover a imagem de fundo?   [ Remover ]  [ Cancelar ]
  ```
  Confirmação **inline**, substituindo a linha de ações do estado D. Não é
  `window.confirm`, não é modal. Após remover: volta a A + anúncio
  `Imagem de fundo removida.` + o link `Desfazer alteração de tema` (§9.3) fica
  disponível por 10s — é a rede de segurança real, a confirmação é só o
  pedágio. Mecanismo: *loss aversion* aplicada com honestidade (o trabalho de
  achar aquela imagem é o que se perde).
- Remover a imagem **não** zera blur/darken/scale; os valores ficam guardados e
  voltam se o usuário enviar outra imagem. Zerar puniria quem só quis trocar.

### 6.3 Composição no card

A imagem entra como camada de fundo do `#capture-root`:
`background-image: url(<path>)`, `background-size: cover`,
`transform: scale(<scale>)` num wrapper com `overflow: hidden`, `filter:
blur(<blur>px)`, e **por cima** um véu sólido de escurecimento.

O véu **não** pode ser `rgba()`/alpha-slash — o guard de ACM-029 barra
alpha-slash e o `html-to-image` já mostrou fragilidade com composição alpha.
Regra: o véu é um `<div>` com `background-color` **hex de 8 dígitos**
(`#000000` + 2 dígitos de alpha derivados do slider, ex. 40% → `#00000066`),
que é hex literal e sobrevive à rasterização. O implementer deve confirmar isso
num export real antes de fechar a task; se o guard reclamar de 8 dígitos, a
alternativa é `opacity` no elemento do véu com `background-color: #000000`.

O `blur` é aplicado **só na camada de imagem**, nunca no card inteiro — senão
os ícones e o texto borram junto.

---

## 7. Sliders

| Controle | Range | Step | Default | Formato exibido | Efeito |
|---|---|---|---|---|---|
| **Desfoque** | 0 – 20 | 1 | `0` | `6 px` | `filter: blur(Npx)` na camada de imagem |
| **Escurecer** | 0 – 90 | 5 | `40` | `40 %` | alpha do véu (§6.3) |
| **Escala** | 100 – 200 | 5 | `100` | `130 %` | `transform: scale(N/100)` na camada de imagem |

Justificativas de range:
- Blur acima de 20px em 540px de card vira cinza chapado — passar disso é dar
  ao usuário um jeito de se sabotar.
- Darken começa em 40% porque é o valor mínimo em que um `CARD_FG` claro se
  mantém legível sobre uma screenshot média do Albion (fundo do jogo é
  claro/saturado em zonas abertas). Default seguro > default neutro.
- Escala nunca abaixo de 100%: menos que isso descobriria as bordas do card.

Comportamento:
- **Atualização em tempo real** (AC#3): `onInput`, não `onChange`. Escrever no
  store a cada `input` é aceitável (é um número); se medição mostrar jank no
  preview, usar `requestAnimationFrame` para o repaint do preview e manter o
  store síncrono. **Não usar debounce no valor exibido** — número que atrasa
  parece travado.
- O valor aparece à direita do rótulo, num `<output>`, em `font-variant-numeric:
  tabular-nums` (senão o número dança ao passar de 9 pra 10).
- Duplo-clique no thumb (e `Home`) restaura o default do controle. Documentado
  no `title` do slider.
- Desabilitados sem imagem de fundo (§6.1-A).

---

## 8. Proporção (square / wide / auto)

Segmented control de 3 opções, `role="radiogroup" aria-label="Proporção do card"`.

| Opção | Rótulo | O que o usuário vê mudar | Saída do PNG (`scale: 2`) |
|---|---|---|---|
| `square` | `Quadrado` | O wrapper do preview vira 1:1. O `BuildCard` (540 de largura, doc-006) é centralizado vertical e horizontalmente; a sobra recebe o fundo (surface do preset + imagem). | 1080 × 1080 |
| `wide` | `Largo` | Wrapper 16:9. Card centralizado; sobra lateral maior — é o formato que o Discord mostra sem cortar no preview inline. | 1600 × 900 |
| `auto` | `Automático` | Wrapper com altura do conteúdo. Sem sobra. É o único que nunca corta nem sobra, e o único que serve pro layout List (altura livre, doc-006 §3). | 1080 × altura do conteúdo |

- **Abaixo do controle há uma linha reativa**: `1080 × 1080 px no PNG exportado`
  (12px, muted, `aria-live="polite"`). Essa linha é o que torna a escolha
  concreta; sem ela, "Quadrado/Largo" é abstração.
- **Regra de proteção**: se o card não cabe na proporção escolhida (ex.: layout
  `list` com 10 linhas em `wide`), o card **não** é cortado. Aparece um aviso
  inline sob o controle: `A build é alta demais para esse formato — o card foi
  ajustado.` e o wrapper cresce. Cortar o conteúdo do usuário em silêncio é o
  pior desfecho possível para um produto cujo output é uma imagem.
- Default: `auto`. Escolha deliberada — nenhum recorte na primeira exportação
  de quem nunca abriu este painel.

---

## 9. Estados obrigatórios

### 9.1 Tabela

| Superfície | Loading | Vazio | Erro | Sucesso |
|---|---|---|---|---|
| Rail / painel | Não tem. Presets são constantes locais; nada é buscado. | n/a (sempre há 5 presets) | n/a | n/a |
| Preview dentro do painel | Herdado do card (`use-icon-status` cobre ícone a ícone) | Build sem itens → o `BuildCard` já tem seu vazio (doc-006 §2.7): 9 placeholders + `Escolha a mão principal para montar a build` | Fallback do `ItemIcon` | n/a |
| Dropzone | §6.1-C, com progresso | §6.1-A **com CTA** (`Arraste uma imagem ou clique`) | §6.1-E, 5 causas, cada uma com ação | §6.1-D |
| Sliders | n/a | Sem imagem → desabilitados + `Envie uma imagem para ajustar` | n/a | n/a |
| Cor de destaque | n/a | n/a | Hex inválido digitado → borda `--color-icon-error-fg` + `Use um hex de 6 dígitos, ex. #E8823C`. O valor do card **não muda** enquanto inválido. | n/a |
| Fonte | Fonte web ainda carregando → amostra em `font-display: swap`, sem skeleton | n/a | Fonte falhou → cai no default e mostra `Não deu para carregar essa fonte. Usando Inter.` | n/a |
| Proporção | n/a | n/a | Estouro de altura → aviso do §8 | n/a |
| Persistência do tema | O tema faz parte do save da build; o feedback é o da action bar (doc-004 §2.4) — **não** criar um segundo canal `aria-live` no painel para save | n/a | idem action bar | idem |

Nenhum estado vazio sem CTA. O único "vazio" real aqui é o dropzone, e ele é
todo CTA.

### 9.2 O estado `custom` do seletor

**Sim, vira `custom` automaticamente.** Regra explícita:

> Alterar **qualquer** valor de tema enquanto um preset nomeado está ativo
> muda `theme.preset` para `"custom"`, preservando todos os valores atuais.

- O card `Personalizado` **não é clicável para aplicar** (`aria-disabled` +
  `tabindex="-1"` quando não é o valor atual). Não há "tema personalizado
  canônico" para aplicar — é um estado derivado. Um card que parece clicável e
  não faz nada é pior que um card desabilitado explícito.
- Quando ativo, ele mostra a origem e o caminho de volta:
  ```
  ┌──────────────┐
  │ ▓▓▓▓▓▓▓▓▓▓▓▓ │   ← swatch com as cores atuais
  │ Personalizado│ ✓
  │ base: Gelo   │   11px muted
  └──────────────┘
  Voltar para Gelo          ← link 13px, logo abaixo da grade
  ```
- `Voltar para Gelo` reaplica o preset inteiro (inclusive descartando accent
  custom), **mas não remove a imagem de fundo nem os sliders** — imagem é
  conteúdo do usuário, preset é cor. Copy do link deixa isso claro no `title`:
  `Restaura as cores do preset Gelo. A imagem de fundo é mantida.`
- Clicar num preset nomeado estando em `custom`: aplica direto, sem
  confirmação. O `Desfazer` (§9.3) cobre o arrependimento.
- Anúncio: `Tema personalizado, baseado em Gelo.` (§11).

### 9.3 Desfazer

Um único nível de undo, escopo tema, no rodapé do painel:
`Desfazer alteração de tema` (13px, `text-foreground/70`). Aparece após
qualquer mudança e some depois de 10s de inatividade ou ao fechar o painel.
Restaura o snapshot imediatamente anterior de `theme_json` (inclui remoção de
imagem). Não é histórico completo — é a rede para o clique errado, que é o erro
real neste painel.

---

## 10. Modelo de dados (`theme_json`)

`BuildCardTheme` (`src/components/build-card/types.ts`) cresce de 2 para 9
campos. Todos com default, todos serializáveis, **nenhum dataURL**:

| Campo | Tipo | Default |
|---|---|---|
| `preset` | `"dark-purple" \| "gold" \| "blood" \| "ice" \| "custom"` | `"dark-purple"` |
| `accent` | hex 6 dígitos ou `null` (usa o accent do preset) | `null` |
| `font` | `"inter" \| "geist" \| "cinzel"` (chave, nunca family string) | `"inter"` |
| `background` | `{ path: string; width: number; height: number; bytes: number } \| null` | `null` |
| `blur` | `0..20` | `0` |
| `darken` | `0..90` | `40` |
| `scale` | `100..200` | `100` |
| `showItemNames` | `boolean` | `false` (mantém o atual) |
| `showSpellNames` | `boolean` | `true` (mantém o atual) |
| `aspect` | `"square" \| "wide" \| "auto"` | `"auto"` |

`DEFAULT_BUILD_CARD_THEME` é atualizado; os dois campos existentes mantêm o
default atual para não mudar cards já salvos. O schema de escrita
(`build-schema.ts`) precisa de bounds equivalentes, e os limites numéricos e o
regex de accent vêm de `validation-constants.ts` (regra da ACM-059 — não
duplicar número entre cliente e servidor).

Migração: `theme_json` legado (2 campos) → mesclar sobre os defaults. Nunca
lançar erro em tema antigo; um build que não abre por causa de cor é um bug
grave por uma causa trivial.

---

## 11. Acessibilidade

Explícito, porque o projeto já acumulou findings (ACM-038, ACM-042):

**Estrutura**
- O painel é `<aside aria-labelledby="theme-panel-title">` com `<h2
  id="theme-panel-title">Aparência</h2>`. No modo sheet (<768px) vira
  `role="dialog" aria-modal="true"` **com focus trap** — só nesse modo, porque
  só nele o resto da página está `inert`.
- Botão `Aparência`: `aria-expanded`, `aria-controls="theme-panel"`.
- Grupos: `<details>`/`<summary>` nativo, ou disclosure com `aria-expanded` no
  botão e `<h3>` dentro. O resumo do estado fechado é conteúdo do `summary`,
  logo é lido junto — o usuário de leitor de tela também ganha a orientação.

**Sliders**
- `<input type="range">` nativo. Não reimplementar com `div`+drag.
- `<label for>` explícito: `Desfoque do fundo`, `Escurecer o fundo`,
  `Escala da imagem de fundo` — rótulos **completos**, não `Desfoque` solto (o
  visual pode ser curto; o `aria-label` não).
- `aria-valuetext` com unidade: `6 pixels`, `40 por cento`, `130 por cento`.
  Sem isso o leitor anuncia "6" e o usuário não sabe de quê.
- `<output for="slider-blur">` para o valor visível.
- Teclado: setas (±1 step), `PageUp/PageDown` (±5 steps), `Home` (default,
  não mínimo — decisão consciente, documentada no `title`), `End` (máximo).
- Desabilitado: `aria-disabled="true"` **e permanece focável**, com
  `aria-describedby` apontando para `Envie uma imagem para ajustar` (mesmo
  padrão do `Salvar` desabilitado em doc-004 §2.4-A).

**Preset**
- `role="radiogroup" aria-label="Preset de tema"`, cada card
  `role="radio" aria-checked`. Navegação por setas dentro do grupo, um único
  tab stop (padrão APG de radiogroup). `Personalizado` fora da ordem de foco
  quando inativo.
- **Nunca só cor**: cada card tem rótulo textual e o selecionado tem `✓`
  visível além da borda accent. Daltônico precisa ver a seleção.
- Anúncio de troca: um `role="status" aria-live="polite"` único do painel
  (não empilhar regiões — mesma regra de doc-004 §8) emite
  `Tema Dourado aplicado.` / `Tema personalizado, baseado em Gelo.` /
  `Imagem de fundo aplicada.` / `Imagem de fundo removida.`. Mudanças de
  slider **não** vão para essa região (o `aria-valuetext` do range já é
  anunciado pelo próprio widget; duplicar vira ruído contínuo).

**Cor de destaque**
- `<input type="color">` nativo **e** campo de texto hex ao lado, sincronizados.
  O picker nativo sozinho é inacessível por teclado em vários navegadores; o
  campo de texto é a rota de teclado garantida.
- Os 6 atalhos de cor são `<button>` com `aria-label` nomeado
  (`Usar destaque Dourado #E8C95F`), não swatches mudos.

**Contraste e foco**
- Chrome do painel usa os tokens de `globals.css`; `text-foreground/70`
  (6,15:1) para secundário, `--color-icon-muted` (7,07:1) para muted — ambos já
  medidos na review de ACM-038. **Proibido hex literal em `className`** fora de
  `build-card/**` (ACM-042 é o precedente).
- Foco: regra global `:focus-visible` (outline branco 2px, offset 3px) +
  `focus-visible:transition-none` em tudo que tem `transition-colors`. O thumb
  do range precisa de outline próprio (`::-webkit-slider-thumb:focus-visible`)
  — o outline no wrapper do input não é visível o bastante.
- A borda do card de preset selecionado é `2px solid` accent **do chrome**
  (`--color-accent`), não do preset — senão o indicador de seleção do preset
  `ice` some contra o próprio swatch azul.
- `prefers-reduced-motion`: o slide-over/sheet abre sem transform animado.
  A regra global já força `transition-duration: 0.01ms`; a implementação não
  pode usar animação JS que ignore isso.
- `prefers-contrast: more`: bordas dos grupos e do dropzone sobem de
  `--color-border` para `--color-icon-slot-empty`.

**Teclado — ordem no painel**
`Aparência` → (painel) `×` → grade de presets (1 stop) → summary Fundo →
dropzone → blur → darken → scale → summary Cores → swatch → hex → atalhos →
fonte → summary Conteúdo → switch item → switch spell → segmented proporção
(1 stop) → `Desfazer` → volta ao editor.

---

## 12. Verificação manual

1. **Presets no PNG.** Aplicar cada um dos 4 presets, exportar PNG, abrir o
   arquivo: fundo, borda, faixa de accent e texto devem estar presentes.
   Qualquer cor faltando = regressão de `oklch` (D4).
2. **Fundo no PNG.** Enviar uma screenshot do jogo, blur 8 / escurecer 60 /
   escala 130, exportar: a imagem aparece borrada e escurecida, e os ícones e
   textos **não** estão borrados.
3. **Erros de upload.** Enviar um `.gif`, depois um JPEG de 7 MB: as duas
   mensagens do §6.1-E aparecem dentro do dropzone; a imagem anterior (se
   houver) continua no card.
4. **Custom automático.** Aplicar `Gelo`, mexer no slider de escurecer: o
   seletor passa a `Personalizado · base: Gelo` e o link `Voltar para Gelo`
   aparece. Clicar nele restaura as cores e **mantém** a imagem.
5. **Gold × tier 7.** Card com item T7 sob o preset `gold`: o badge de tier
   ainda é distinguível do fundo (§5.2).
6. **390px.** Abrir a sheet em 390×844: sem scroll horizontal em nenhum ponto,
   a action bar de rodapé some, `Concluir` é alcançável, e nenhum thumb de
   slider fica fora da tela. Rodar com o DevTools medindo
   `document.documentElement.scrollWidth === 390`.
7. **Capture root único.** Com a sheet aberta em 390px (mini-preview montado),
   `document.querySelectorAll('#capture-root').length === 1`. Este é também um
   teste automatizado obrigatório.
8. **Teclado puro.** Percorrer a §11 inteira sem mouse, com VoiceOver ligado:
   cada slider anuncia rótulo completo + valor com unidade; a troca de preset é
   anunciada uma vez.
