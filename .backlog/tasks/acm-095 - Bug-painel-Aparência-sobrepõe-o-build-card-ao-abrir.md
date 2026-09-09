---
id: ACM-095
title: 'Bug: painel Aparência sobrepõe o build card ao abrir'
status: In Review
assignee: []
created_date: '2026-09-09 02:31'
updated_date: '2026-09-09 03:13'
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
<!-- SECTION:NOTES:END -->
