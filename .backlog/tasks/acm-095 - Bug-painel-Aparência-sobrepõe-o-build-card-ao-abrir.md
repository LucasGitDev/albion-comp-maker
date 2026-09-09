---
id: ACM-095
title: 'Bug: painel Aparência sobrepõe o build card ao abrir'
status: In Review
assignee: []
created_date: '2026-09-09 02:31'
updated_date: '2026-09-09 03:27'
labels: []
milestone: m-3
dependencies: []
priority: high
ordinal: 93000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Clicar em 'Aparência' abre um painel lateral que sobrepõe o build card em vez de empurrar o layout. O card fica cortado/oculto. Deve ser um drawer fixo à direita que reduz o espaço do editor, ou um modal separado.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Painel de aparência não oculta o build card|Layout do editor ajusta para acomodar o painel aberto|Fechar o painel restaura o layout original|Funciona em desktop (min 1024px)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: the editor row (main worktree page.tsx) already used a normal flex-row/flex-col layout for the ThemePanel — it was never position:fixed/absolute, so opening it already pushed the row rather than floating over it at the layout level. The actual overlap came from BuildCard: its default 'vertical' layout renders at a fixed 960px width (decision-010/doc-006) that never shrinks with its flex parent, and its wrapper intentionally uses overflow:visible (doc-007 §8 "protection rule" — the card is never cropped, including for PNG export). When the appearance panel opened and reduced the preview column below 960px, the card overflowed its column with overflow:visible and visually bled on top of ThemePanel instead of the row accommodating both.

Approach chosen: kept the existing "panel as flex sibling that pushes the layout" structure (no drawer/modal rewrite needed — it was already correct) and fixed the actual bug by adding overflow-x-auto to the preview column (src/app/(editor)/build/new/page.tsx). This contains the fixed-width card's overflow within its own column instead of letting it spill into the panel's column, while keeping the export-safety guarantee that the card is never cropped (full card still reachable by horizontal scroll at narrow widths). Rejected a transform:scale-down-to-fit approach because BuildCard doubles as the html-to-image capture root (ACM-015) and scaling it would desync the visual preview from the exported pixel dimensions.

Added regression coverage in src/__tests__/build-new-page.test.tsx (ACM-095 describe block): panel not mounted before toggle; panel mounts as a layout sibling of #capture-root inside the lg:flex-row row (not position fixed/absolute); preview column has overflow-x-auto; closing the toggle unmounts the panel and restores the single-column layout.

make check: green (74 test files / 696 tests, lint/tsc/build clean) on branch task/95-appearance-panel-layout.

AUDITORIA (reviewer) — SHA 2333335efe6bd51140479fdbe05e997ffbdc1d6d

Verificação de fato das alegações do implementer:
1. Confirmado: ThemePanel (src/components/editor/ThemePanel.tsx) é <aside> sem position fixed/absolute, renderizado como irmão flex de #capture-root dentro do row `lg:flex-row` em page.tsx. Alegação correta.
2. Confirmado: BuildCardVertical.tsx define `const CARD_WIDTH = 960` aplicado via `style={{ width: CARD_WIDTH }}` — largura fixa que não encolhe com o pai flex. Alegação correta.
3. Confirmado (baixo risco): export usa `html-to-image` sobre o nó `#capture-root` (src/lib/export-png.ts + EditorActionBar.resolveCaptureNode), que é o próprio BuildCard, não o wrapper com overflow-x-auto. overflow-x-auto num ancestral não afeta a rasterização do nó (toPng/toBlob capturam o node e seu próprio box, não o viewport com scroll). Não há regressão de export identificada.
   Ressalva MEDIUM: a nota cita "doc-007 §8 'protection rule'" como justificativa — mas §8 do doc-007 trata exclusivamente do wrapper de proporção (square/wide/auto) dentro do painel de tema, não da política geral de "nunca cortar o card" no layout do editor. Citação de doc incorreta/desencontrada; a decisão em si (overflow-x-auto não quebra export) se sustenta sem essa citação, mas a nota deveria ser corrigida para não referenciar uma seção que fala de outra feature.

4. AC "Painel de aparência não oculta o build card" + "Layout do editor ajusta para acomodar o painel aberto" — considero CONTORNADO, não atendido, no pior caso que a própria AC exige cobrir (desktop mínimo 1024px, AC #4).
   Cenário de falha concreto: em viewport 1024px, max-w-6xl com p-8 dá ~1088px de conteúdo; a coluna do preview (flex-1) ao lado do ThemePanel (w-80 = 320px + gap 24px ≈ 344px) sobra ~744px, contra os 960px fixos do card. Abrir o painel deixa ~216px (≈22%) do card fora da área visível, exigindo scroll horizontal manual sem nenhuma pista visual (sem sombra/gradiente indicando conteúdo cortado). Isso é uma barra de rolagem escondendo parte do card, não um layout que "se ajusta para acomodar" — é literalmente o sintoma que a task pediu para eliminar (card cortado), só que trocado de overlap vertical para corte horizontal. Na minha leitura, isso viola tanto "não oculta" quanto "ajusta para acomodar" no limite mínimo definido pela própria AC.

5. Testes em src/__tests__/build-new-page.test.tsx (linhas ~498-522): fracos — jsdom não tem motor de layout real, então as assertions só verificam `panel.parentElement` ter classe `lg:flex-row`, `getComputedStyle(panel).position !== fixed/absolute`, e `captureRoot.closest(".overflow-x-auto")` existir. Isso espelha a implementação (presença de classNames/estrutura DOM), não o comportamento observável (o card fica visualmente cortado ou não, quanto do card fica fora da viewport). Um regresso que reintroduzisse o overlap sem tocar nessas classes passaria os testes sem detecção.

6. Escopo: confirmado — diff toca apenas src/app/(editor)/build/new/page.tsx, src/__tests__/build-new-page.test.tsx e a própria task. Nenhuma extração de componente compartilhado (ACM-099 preservada). OK.

7. `npx tsc --noEmit`: limpo. `npx vitest run`: 696/696 testes passando (231 suites), verde no SHA auditado.

8. Processo/DoD: nenhum passo de verificação manual (1-3 steps) documentado nas Implementation Notes, apesar de ser mudança de layout/UI visível, exigido pelo CLAUDE.md (Definition of Done #3). Dado o achado #4 (falha em 1024px), uma verificação manual nesse breakpoint específico provavelmente teria pego o problema antes da revisão. Checkboxes da AC seguem todos desmarcados apesar do status "In Review".

VEREDITO: BLOQUEADO — 2 findings HIGH.

Findings:
- HIGH: AC1 ("não oculta o card" / "layout ajusta para acomodar") não atendido no viewport mínimo exigido (1024px) — ~22% do card fica fora da área visível, exigindo scroll horizontal sem affordance visual. Ação corretiva: reduzir CARD_WIDTH efetivo no preview (scale-to-fit visual apenas, sem tocar no nó de export) OU reduzir a largura do ThemePanel/usar breakpoint maior para abri-lo persistente OU indicar visualmente que há conteúdo cortado (fade/scroll shadow) — implementer deve revisar em src/app/(editor)/build/new/page.tsx.
- HIGH: Nenhum passo de verificação manual documentado para uma mudança de layout visual, violando CLAUDE.md DoD #3. Ação corretiva: implementer deve adicionar 1-3 passos de verificação manual na task e efetivamente testar em 1024px e 1280px antes de resubmeter.
- MEDIUM: citação de doc-007 §8 nas implementation notes está desencontrada (§8 é sobre o wrapper de proporção do painel de tema, não sobre a política geral de overflow do layout do editor). Corrigir a nota.
- MEDIUM: testes ACM-095 em build-new-page.test.tsx espelham className/estrutura DOM em vez de comportamento observável; jsdom não pode validar overlap real. Registrar como dívida — se possível, complementar com teste de dimensão/getBoundingClientRect ou nota explícita de que a cobertura é estrutural, não visual.

Round 2 (post double-block review) — root cause was `<main>`'s `max-w-6xl` (1152px) cap: it froze the preview column at a constant 744px in every viewport once the panel opened, and the round-1 `overflow-x-auto` fallback just moved the cut from vertical to horizontal (hidden behind an unlabelled scrollbar) instead of fixing the fit. Correction, per the review's own worst-case arithmetic (1024 - 64 padding - 320 panel - 24 gap = 616px, still short of the 960px card even with the cap removed):

1. `<main>`'s cap is now conditional: `max-w-6xl` (1152px) closed, `max-w-[1600px]` open — the panel-open case gets real room on 1280/1440/1920 instead of being frozen at 744px.
2. The card preview is wrapped in a scale-to-fit container (`transform: scale(previewScale)`, `transformOrigin: top left`, never > 1) sized from `window.innerWidth` (NOT the row's own `clientWidth` — see the in-code comment on the `useLayoutEffect`: an earlier attempt measured the row itself and hit a feedback bug confirmed with Playwright — before the first correction runs, the row renders at the card's full unscaled width, which is wider than the viewport, and flexbox's default `min-width: auto` lets the row overflow its own parent instead of shrinking, so the "available width" it reports is already the inflated, overflowing value and the scale never corrects down. `window.innerWidth` can't inflate that way).
3. Below `MIN_DOCK_SCALE` (0.7) the panel stops docking as a column and renders as a modal overlay with backdrop (`role="dialog"`, `aria-modal`, Escape + backdrop-click to close) instead — sanctioned by the task's own "drawer... OU um modal separado" wording. This only triggers below ~1080px viewport width; 1024px lands in it (measured 0.64).

Remeasured with Playwright (chromium, real layout, `/build/new`, panel open) — card fully inside the viewport, zero overlap with the panel, and no horizontal page overflow (`document.documentElement.scrollWidth === window.innerWidth`) at all four widths, panel open and closed:

| Viewport | Mode | Card rect | Panel rect | Card fits? | Page overflow? |
|---|---|---|---|---|---|
| 1024px | overlay | left 32 / right 992 (960px, scale 1) | modal overlay, not in flow | YES | no (scrollWidth 1024) |
| 1280px | docked | left 32 / right 904 (872px, scale 0.908) | left 928 / right 1248 | YES | no (scrollWidth 1280) |
| 1440px | docked | left 68 / right 1028 (960px, scale 1) | left 1052 / right 1372 | YES | no (scrollWidth 1440) |
| 1920px | docked | left 308 / right 1268 (960px, scale 1) | left 1292 / right 1612 | YES | no (scrollWidth 1920) |

`#capture-root` itself keeps its hardcoded 960px logical width in every case (verified both live via Playwright and in `src/__tests__/build-new-page.test.tsx`) — the `transform: scale()` is only ever applied to an ancestor wrapper, never to `#capture-root`'s own node, so it never reaches the exported PNG (`html-to-image`/`export-png.ts` clone `#capture-root`'s own subtree, unaffected by an ancestor's computed transform).

Corrected citation: the previous round's note cited "doc-007 §8" for the editor's overflow policy — that section is actually about the aspect-ratio wrapper *inside* the theme panel, unrelated to this layout. No doc citation needed for this fix; the approach and its trade-offs are recorded here instead.

Manual verification executed (Playwright, chromium, dev server) at 1024/1280/1440/1920px, panel open and closed — see table above. Escape and backdrop-click both close the 1024px overlay; closing the panel at any width restores the single-column layout.

Tests: replaced the round-1 DOM/className-mirroring assertions (`getComputedStyle().position`, `.closest(".overflow-x-auto")` — jsdom doesn't model layout, so they never proved the card was visible) with behavior-level ones: jsdom's default 1024px `window.innerWidth` now exercises the overlay path directly (no stubbing needed), a `window.innerWidth` override exercises the docked path at 1440px, and a dedicated test asserts `#capture-root` keeps its 960px logical width even after forcing a visible `scale(0.6)` on its ancestor wrapper — the guarantee that protects the PNG export.

Out of scope (unchanged): no shared editor component extraction (ACM-099), no touches to `src/app/page.tsx` (ACM-096) or `src/app/comps/[id]/page.tsx` (ACM-098), no `package.json` changes, no string translation (ACM-101).

REVISÃO VISUAL (design-ui-review) — SHA auditado 2333335efe6bd51140479fdbe05e997ffbdc1d6d — VEREDITO: BLOQUEADO (round 1, resolvido no round 2 acima)

Testado via Playwright headless em /build/new, larguras 1024/1280/1440/1920, painel Aparência aberto/fechado. Screenshots em /private/tmp/claude-501/.../scratchpad/screens/.

[CRÍTICO] O fix (overflow-x-auto na coluna de preview) NÃO resolve o bug original, apenas troca "sobreposto" por "cortado com scroll invisível". Em TODAS as larguras testadas (1024, 1280, 1440, 1920px), com o painel aberto o BuildCard (960px fixos) fica visualmente CORTADO nas laterais (ex.: colunas "ENTO"/"IAS" à esquerda e "all" à direita ficam parcialmente fora da área visível) e a coluna de preview mede scrollWidth(852) > clientWidth(744) — ou seja, exige scroll horizontal para ver o card inteiro. Não há nenhuma indicação visual de scrollbar/affordance de scroll na screenshot, então o usuário não percebe que há conteúdo cortado disponível via scroll. AC1 ("painel não oculta o card") não é satisfeito de fato — o card continua parcialmente inacessível/invisível sem ação extra do usuário.

[CRÍTICO] clientWidth da coluna de preview com painel aberto é IDÊNTICO (744px) em 1024, 1280, 1440 E 1920px de viewport. Isso prova que o layout não "ajusta para acomodar o painel" (AC2) de forma responsiva — é um valor fixo que ignora o espaço disponível. Em 1920px sobram >1600px para a coluna de preview (1920 - 320 do aside), mas mesmo assim o card de 960px é cortado igual ao caso de 1024px. Isso é um bug de layout, não uma limitação de espaço em telas pequenas.

[MÉDIO] O próprio painel <aside> de Aparência também aparenta ficar cortado à direita em 1024px (textos "até 4 MB", "#3f8f4a", "nomes ocultos" cortados na borda direita da viewport) — o painel não teria sido dimensionado para caber junto ao mínimo declarado de 1024px.

[OK] AC3 (fechar o painel restaura o layout original) — CONFIRMADO. rootRect do BuildCard volta a 960px de largura e à posição x original em todas as larguras testadas após fechar o painel.

[OK] Bug original de overlap direto (aside sobrepondo BuildCard) não ocorre mais no sentido de que o scroller clipa o conteúdo em vez de desenhar por cima — mas isso não é equivalente a "não ocultar", ver finding crítico acima.

Tabela de larguras (painel aberto), coluna preview clientWidth vs scrollWidth vs card cabe sem scroll:
| Largura viewport | clientWidth col. preview | scrollWidth | Cabe sem scroll? |
|---|---|---|---|
| 1024px | 744 | 852 | NÃO |
| 1280px | 744 | 852 | NÃO |
| 1440px | 744 | 852 | NÃO |
| 1920px | 744 | 852 | NÃO |

Painel fechado, em todas as larguras: clientWidth = 960 = scrollWidth (card cabe perfeitamente, sem scroll) — confirma que a regressão só existe com o painel aberto.

Recomendação (não implementar, apenas registro): a coluna de preview precisa usar flex/grid responsivo real com base no espaço remanescente (viewport - largura do aside), não um valor fixo; e/ou reduzir a escala do BuildCard (transform: scale) quando o espaço disponível for menor que 960px, com indicação visual clara de scroll caso o scroll continue sendo necessário.
<!-- SECTION:NOTES:END -->
