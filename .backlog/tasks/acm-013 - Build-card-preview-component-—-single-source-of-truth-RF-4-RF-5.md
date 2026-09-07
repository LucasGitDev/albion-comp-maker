---
id: ACM-013
title: 'Build card preview component — single source of truth (RF-4, RF-5)'
status: Done
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 17:11'
labels: []
milestone: m-3
dependencies:
  - ACM-008
  - ACM-009
  - ACM-010
  - ACM-011
  - ACM-012
ordinal: 13000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The preview component IS the export component. No separate layout for export. Supports vertical and grid layouts, theme tokens.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Renders BuildState as visual card
- [x] #2 vertical layout: icon left, name right, spells below
- [x] #3 grid layout: builds side by side, role as column header
- [x] #4 Same React component tree used for both screen preview and PNG export
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
UX spec (ACM-013) — BuildCard, fonte única para preview e export. Depende de ACM-008/009/010/011/012.

## 0. A regra que faz "single source of truth" ser verdade
Não basta o mesmo componente: basta **um `<div id="capture-root">` que não contém nenhum elemento interativo**. Todo o chrome de edição (hover, botões "×", focus ring, tooltips, handles) é renderizado em uma **camada irmã absolutamente posicionada por cima**, nunca dentro do nó capturado.

```
<div class="relative">
  <BuildCard ref={captureRef} state={build} theme={theme} />   ← html2canvas captura ESTE nó
  <EditOverlay state={build} />                                ← irmão, nunca capturado
</div>
```
Alternativas rejeitadas: `mode="export"` com condicionais dentro do card (toda condicional é uma chance de divergência silenciosa que só aparece no PNG do usuário); e clonar o DOM para exportar (o clone perde estilos computados e é exatamente o bug que a task quer evitar). Registrar como `backlog decision create "Capture root sem chrome interativo"`.

Consequências obrigatórias:
- Zero `:hover` dentro do card. Hover vive no overlay.
- Zero `oklch()`/`color-mix()`/`lab()` dentro do card — html2canvas não parseia; usar hex/rgb. Tailwind v4 emite oklch por padrão: as cores do card vêm de CSS custom properties em hex declaradas no `@theme`, aplicadas via `style` ou classes que resolvem para hex.
- Fonte auto-hospedada e `await document.fonts.ready` antes de capturar. Fonte externa = PNG com fallback serif.
- Ícones via `/api/icon` (mesma origem) — já é o caso por doc-001; nunca URL da Render API direto, senão canvas contaminado.
- Nada de `position: sticky`, `transform` no ancestral ou `overflow: hidden` cortando; o card é um bloco de fluxo com dimensão lógica fixa.

## 1. Dimensões
Largura lógica fixa **960px**; captura com `scale: 2` → PNG de 1920px. Supera o mínimo de 800px do requisito não-funcional e sobrevive ao zoom no Discord.
- `vertical` (1 build): 960 × altura automática (tipicamente 620–860px conforme swaps).
- `grid` (comp, ACM-020): coluna de 320px por build, papel como cabeçalho de coluna; 3 builds = 960px, 5 = 1600px. A largura da coluna é a mesma constante em ambos os layouts, então um build renderizado sozinho e o mesmo build dentro da comp têm ícones do mesmo tamanho.

## 2. Wireframe — layout `vertical`

┌───────────────────────────────────────────────────── 960 ──────────────┐
│ ▌TANK                                                                  │ ← barra accent 6px + papel
│                                                                        │
│  ┌────────┐   BRUISER DE FRONTLINE                                     │
│  │        │   Martelo de Guerra · T8.1                                 │
│  │  ícone │   ┌───┐ ┌───┐ ┌───┐ ┌───┐                                  │
│  │  144px │   │ Q │ │ W │ │ E │ │ P │   ← spells da arma, 56px         │
│  │        │   └───┘ └───┘ └───┘ └───┘                                  │
│  └T8──.1──┘   Explosão  Investida  Grito  Resistência   ← 11px, opcional│
│                                                                        │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                        │
│  EQUIPAMENTO                                                           │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐        │
│  │cabe│  │peit│  │bota│  │capa│  │secu│  │bols│  │mont│  │comi│        │
│  │ 80 │  │ 80 │  │ 80 │  │ 80 │  │ 80 │  │ 80 │  │ 80 │  │ 80 │        │
│  └T8.1┘  └T8.1┘  └T8.1┘  └T8──┘  └────┘  └T7──┘  └T8──┘  └T8──┘        │
│  [W][P]  [W][P]  [W][P]  [Q]     ─       ─       ─       ─             │
│                                                                        │
│  ─────────────────────────────────────────────────────────────────────  │
│  SWAPS OBRIGATÓRIOS                                                    │
│  [ico] Martelo ─→ [ico] Machado   ·  Bridge fight                      │
│  [ico] Martlock ─→ [ico] Lymhurst ·  Contra burst                      │
│                                                                        │
│  ────────────────────────────────────────────────────  albioncomp.gg   │ ← rodapé 11px, 40% opacidade
└────────────────────────────────────────────────────────────────────────┘

Hierarquia: a **arma principal é o herói** (144px vs 80px dos demais). É por ela que o membro do grupo identifica o build em 1 segundo rolando o Discord. Uma tela, uma ação primária — aqui: um card, uma leitura primária.
Slots vazios **não são renderizados** no card exportado (diferente do editor, onde o vazio é convite). Espaço tracejado num PNG parece bug.

Layout `grid` (comp): cada coluna = papel no topo (12px/700 uppercase, cor accent do build), arma em 96px, nome do build, grade 2×4 de slots em 48px, swaps condensados a ícones com tooltip removido (no PNG, rótulo em 10px sob os ícones).

## 3. Tipografia e espaçamento
Base 8px. Padding do card 40px (32px no `grid`).
| Papel | Tamanho/peso | Uso |
|---|---|---|
| display | 30/700, tracking -0.01em | nome do build |
| eyebrow | 12/700 uppercase, tracking 0.08em | papel, "EQUIPAMENTO", "SWAPS OBRIGATÓRIOS" |
| body | 15/500 | nome da arma principal |
| caption | 12/500 | nomes de item/spell secundários |
| micro | 10/700 | badges de tier e encanto |
Fonte: uma única família sans auto-hospedada (Inter ou Geist já no projeto), pesos 500/700 apenas — cada peso extra é um arquivo a mais que precisa estar carregado antes da captura.
Nomes de item e spell são **toggles do tema** (ACM-014 `showItemNames`/`showSpellNames`); com ambos desligados o card encolhe ~180px. Default: nomes de spell **ligados**, nomes de item desligados — o membro precisa saber a ability, reconhece o item pelo ícone.

## 4. Variante dark (default, Discord-ready)
Discord dark tem fundo `#313338`. O card **não pode** usar esse tom ou vira mancha sem contorno.
- superfície do card `#12141a`, seções internas `#171a21`
- borda externa 1px `#2a2e37` + radius 16px — o contorno é o que faz o card ler como objeto dentro do embed
- texto primário `#ECEDEE`, secundário `#9aa1ad` (contraste ≥ 4.5:1 no primário, ≥ 3:1 no secundário sobre `#12141a`)
- accent por papel, default do tema: Tank `#4a8fd4`, Healer `#3f8f4a`, DPS `#c8452f`, Support `#a86fd4` — aplicado na barra superior de 6px e no eyebrow do papel
- badges de tier usam `--color-tier-*` de ACM-011; texto do badge `#0b0d11` (tiers claros) para não falhar contraste
- Sem sombra externa (o PNG tem fundo opaco; sombra vira halo cinza). Profundidade vem de contraste de superfície.
- Variante `light` existe mas é secundária; não bloqueia esta task.

## 5. Estados obrigatórios do preview
| Estado | Comportamento |
|---|---|
| vazio (build sem nada) | Card renderiza com placeholder "Sem nome" em itálico muted + área da arma como silhueta 12% opacidade + copy centralizada "Escolha a mão principal para ver o card". Botão "Exportar PNG" desabilitado. O preview nunca some — ver o card se formar é o que sustenta a sessão (**endowment effect**: quanto mais formado o card, maior o custo percebido de abandonar). |
| loading | Enquanto ícones carregam: esqueletos do ItemIcon. Export **bloqueado** até todos os ícones do card estarem `loaded` ou `error`; botão mostra "Carregando ícones… 6/9". Exportar durante o loading produz PNG com buracos — o bug mais caro possível para este produto. |
| erro | Ícone que falhou entra em `error` no editor; no **export** um ícone em `error` vira o quadrado neutro sem "!" (glifo de debug não vai para o Discord) e o botão de export mostra aviso "2 ícones não carregaram — exportar mesmo assim?" com ações "Tentar novamente" / "Exportar assim". |
| sucesso | Após export: toast "PNG copiado" ou "PNG baixado" com miniatura 64px do resultado — confirma que o arquivo é o que ele viu. |

## 6. Hover vs export estático (o que vive no overlay)
| Elemento | Preview na tela | PNG |
|---|---|---|
| tooltip com nome completo de item/spell | sim (overlay) | não |
| botão "×" limpar slot, "Trocar item" | sim (overlay) | não |
| focus ring / outline de teclado | sim (overlay) | não |
| realce do slot correspondente ao hover no editor | sim (overlay, `outline` externo) | não |
| glifos "?" e "!" de ícone ausente/erro | sim | não (§5) |
| rodapé com marca/URL | sim | sim |
| nomes de item/spell | conforme tema | idêntico ao preview |
Regra de aceite operacional: capturar o mesmo nó com o mouse fora da janela e com o mouse sobre um slot deve produzir dois PNGs **byte-idênticos**. É o teste que prova a AC #4 e é automatizável.

## 7. Componentes e tokens
Novos: `BuildCard` (raiz de captura, puro, sem hooks de interação — recebe `state` e `theme` por prop, nenhum acesso à store: é o que permite renderizá-lo no Satori de ACM-022 e no server), `BuildCardVertical`, `BuildCardGrid`, `CardSlotTile` (80px, distinto do `SlotCard` de 168px do editor — este não tem estado vazio nem clique), `EditOverlay`.
`BuildCard` **não** importa Zustand. Justificativa: ACM-022 (Open Graph via Satori) e ACM-021 (SSR) precisam renderizá-lo fora do browser; qualquer acoplamento à store mata isso e força um segundo layout — exatamente o que a task proíbe.
Tokens novos: `--color-card-surface:#12141a; --color-card-surface-2:#171a21; --color-card-border:#2a2e37; --color-card-fg:#ECEDEE; --color-card-fg-muted:#9aa1ad;` + accents por papel. Todos em hex por causa da restrição do html2canvas.

## 8. Verificação manual
1. Exportar com o mouse sobre um slot e fora da janela → PNGs idênticos.
2. Abrir o PNG dentro do Discord em dark mode → borda do card visível contra `#313338`, texto legível sem zoom.
3. Build só com mão principal → card renderiza sem buracos e sem áreas tracejadas.

Implementação (agente implementer):

Componentes novos em src/components/build-card/ (nenhum importa Zustand/store; recebem
BuildState + lookups por prop):
- BuildCard.tsx — raiz de captura (#capture-root), escolhe entre BuildCardVertical/BuildCardGrid via prop `layout`.
- BuildCardVertical.tsx — layout single-build 960px largura fixa (wireframe §2 da spec): barra accent 6px, hero da mão principal (ícone 80px — ver desvio abaixo), equipamento (CardSlotTile, só slots preenchidos), swaps, rodapé "albioncomp.gg".
- BuildCardGrid.tsx — variante coluna 320px do MESMO BuildState, para compor comps lado a lado (ACM-020 compõe N colunas; este componente só renderiza uma).
- CardSlotTile.tsx — tile 80px não-interativo (sem button/onClick/hover), distinto do SlotCard de 168px do editor.
- SpellRow.tsx — chips de spell reusados no hero e nos tiles de equipamento.
- tokens.ts — todas as cores em hex literal (nunca oklch/palette Tailwind), reaproveitando os valores hex de --color-tier-*/--color-enchant do ACM-011 sem tocar em globals.css (fora do escopo desta task).
- types.ts — BuildCardTheme (showItemNames/showSpellNames) e BuildCardLookups (itemNames/spellNames/spellGroupsByItem), lookups read-only injetados pelo caller.

Decisão registrada: decision-010 "Capture root sem chrome interativo" — BuildCard nunca
renderiza chrome interativo (hover/botão/tooltip); isso vive num overlay irmão que o editor
vai possuir (fora do escopo de ACM-013).

Testes: src/__tests__/build-card.test.tsx (10 casos) cobrindo:
- renderização pura a partir de BuildState (sem store/contexto);
- #capture-root único;
- ausência de classes de paleta Tailwind (bg-blue-500 etc.) e de "oklch(" literal no HTML renderizado — prova mecânica da restrição de cor;
- zero elementos interativos (button/input/select/textarea/a[href]) dentro do capture root;
- slots vazios não são renderizados no card exportado;
- placeholder do estado vazio (sem mainhand);
- swaps renderizados quando presentes;
- dois renders do mesmo BuildState produzem HTML idêntico — proxy automatizável para "mouse sobre slot vs. fora da janela produz PNGs idênticos" (spec §6);
- layout grid como coluna estreita do mesmo BuildState.

Desvios da UX spec (documentados, não bloqueantes):
1. Ícone "herói" da mão principal usa ItemIcon size="xl" (80px), não 144px — não existe
   tamanho maior em ICON_SIZE_PX (icon-tokens.ts, fora do escopo desta task) e ItemIcon não
   pode ser modificado (reuso read-only). Diferenciação hero vs. equipamento é dada pelo
   layout (ícone sozinho + nome grande) em vez do tamanho.
2. BuildCardGrid usa CardSlotTile em 80px (não 48px como o §2 da spec sugere para o modo
   grid) para não criar um segundo componente de tile só para essa densidade — mantém "um
   card de slot" em todo o sistema, ao custo de uma coluna de 320px conseguir ~2 tiles por
   linha em vez de mais.
3. EditOverlay (hover, tooltip, botão "×") não foi implementado nesta task — pertence ao
   editor (fora do `touches` autorizado: apenas src/components/build-card/**). Fica
   registrado em decision-010 como trabalho de acompanhamento.
4. Estados "loading"/"erro de ícones" com botões de ação ("Tentar novamente" etc., §5 da
   spec) são chrome interativo e pertencem ao editor/barra de export (ACM-015), não ao
   capture root — BuildCard delega o status visual de cada ícone ao próprio ItemIcon/SpellIcon
   (já existente), sem adicionar UI de decisão.

make check verde (lint 0 erros/2 warnings pré-existentes em ItemIcon/SpellIcon fora do
escopo, tsc, build, 68 testes vitest incluindo os 10 novos).

Verificação manual (item 3 da spec — os únicos aplicáveis sem export real, que é ACM-015):
"Build só com mão principal → card renderiza sem buracos e sem áreas tracejadas" — coberto
pelo teste "does not render empty equipment slots". Itens 1 e 2 da spec (comparar PNGs,
abrir no Discord) dependem do export real (ACM-015) e ficam para a verificação manual
daquela task, que vai consumir #capture-root produzido aqui.

## Code review — PR #15 (task/13-build-card)

Verdict: BLOCKED: 1 findings (HIGH). Everything else passes.

### 1. HIGH — color-mix(in oklab, ...) reaches the capture root via reused SpellIcon badge, untested by the oklch guard
`src/components/icons/SpellIcon.tsx:54` uses `bg-black/70` for the Q/W/E/passive letter
badge. Compiled Tailwind v4 output for `.bg-black\/70` emits TWO rules, the second being
`background-color:color-mix(in oklab, var(--color-black) 70%, transparent)` (verified via
`grep -o '\.bg-black\\/70{[^}]*}' .next/static/chunks/*.css`). This node is rendered inside
every `SpellRow` in `BuildCardVertical`/`BuildCardGrid`/`CardSlotTile` — i.e. inside
`#capture-root` on every single card. decision-007 explicitly names "oklch/color-mix
generated by Tailwind v4" as the risk class html2canvas chokes on and cites it as a reason
html-to-image was chosen, but does not confirm html-to-image handles `color-mix()`
specifically — this has not been verified anywhere in the repo.
Failure scenario: if html-to-image's foreignObject rasterization can't resolve
`color-mix()` (same class of bug as oklch — both are relatively new CSS color functions),
every exported PNG silently loses the dark background behind every Q/W/E/P spell-slot
letter, making the labels unreadable over light icon art. This is exactly the "PNG with
holes" failure class the spec calls "the most costly possible bug."
This is NOT caught by ACM-013's own guard tests: the palette-utility regex only matches
`bg-<palette>-<shade>` class names, and the literal-string test only checks for the substring
`"oklch("` in the rendered HTML — neither scans for `color-mix(` or inspects computed/resolved
styles. The guard is real for what it tests (see mutation test below) but has a documented
blind spot for any inherited/reused component style outside `build-card/**` that resolves to
a non-hex color function.
`SpellIcon.tsx` is out of ACM-013's authorized touch scope (icons dir, reuse read-only), so
this can't be fixed inside this PR. Action needed before ACM-015 (PNG export) merges:
either (a) verify empirically that html-to-image resolves `color-mix()` correctly in a
real export, or (b) replace `bg-black/70` in `SpellIcon.tsx` with a literal `rgba(0,0,0,0.7)`
/ hex-with-alpha value in a follow-up task, and (c) extend the ACM-013 test guard to also
reject `color-mix(` in the rendered HTML, since it currently only rejects `oklch(`.
File: src/components/icons/SpellIcon.tsx:54
Scenario: export any build with an equipped item whose spells are shown → Q/W/E/P badge
background may render transparent/black-if-lucky/invisible depending on html-to-image's
actual color-mix support, never verified.

### Mutation-tested the oklch guard (real, not decorative)
- Injected `bg-blue-500` into `BuildCardVertical.tsx` → "never uses a Tailwind palette
  color utility" test failed as expected.
- Injected `bg-[oklch(0.5_0.1_200)]` (arbitrary-value literal) → "never emits a literal
  oklch()" test failed as expected.
- Verified compiled `.next` CSS bundle contains zero `oklch(` occurrences project-wide, and
  that `.border` (bare Tailwind utility used in BuildCardVertical/Grid) only sets
  border-width/style, never a default border-color — consistent with tokens.ts's inline
  hex overrides being the actual color source.
Conclusion: the guard is real for what it tests, but has the blind spot above (color-mix,
computed styles of reused external components).

### Other checks — all pass, no additional findings
- No interactive elements (button/input/select/textarea/a[href]) anywhere in
  src/components/build-card/** — confirmed by grep and by the passing test.
- No Zustand/store import anywhere in src/components/build-card/** — confirmed by grep.
- No literal emoji glyphs in src/components/build-card/**.
- Imports `SLOT_ORDER` from src/types/build.ts correctly, does not duplicate/relocate it.
  NOTE (LOW, non-blocking): `SLOT_COLUMNS` (also exported by ACM-011's build.ts, with the
  doc-comment "Column grouping used by the editor grid and the exported card layout") is
  never imported or used by BuildCard/BuildCardGrid/BuildCardVertical — equipment is
  rendered as a flat wrap/grid, not grouped into the "Armas/Armadura/Utilidade/Consumíveis"
  columns that comment promises. Not one of the 4 documented deviations, and not required
  by ACM-013's ACs, but the ACM-011 doc-comment now over-promises. Suggest a one-line
  follow-up: either use SLOT_COLUMNS for the grouping or fix the stale comment in
  src/types/build.ts.
- Scope respected: diff touches only src/components/build-card/**,
  src/__tests__/build-card.test.tsx, decision-010, and the ACM-013 task file.
- make check green on the branch: lint 0 errors/2 pre-existing warnings, tsc clean, build
  succeeds, 68/68 vitest tests pass (verified independently, matches implementer's claim).
- The 4 documented deviations (hero icon 80px not 144px, grid reusing 80px tile, EditOverlay
  deferred, interactive error-recovery deferred) are legitimate scope discipline: none of
  ACM-013's 4 ACs require a specific hero icon size, a 48px grid tile, or any interactive
  chrome inside the capture root — decision-010 correctly assigns overlay/interactive work
  to the editor task. No dropped requirement. LOW note only: BuildCardGrid's 320px column
  with 80px tiles in a 2-col grid will look sparse for builds with many equipped slots (up
  to 4 rows of 2) — a visual-density concern for whoever builds the multi-column comp
  (ACM-020), not a blocker here.

### Action required
Move this task back for a corrective follow-up before ACM-015 depends on it: either verify
html-to-image's color-mix() support empirically, or file/queue a task to replace
`bg-black/70` in SpellIcon.tsx with a hex-with-alpha literal and extend the build-card test
guard to also assert absence of `color-mix(` in rendered markup.
<!-- SECTION:NOTES:END -->
