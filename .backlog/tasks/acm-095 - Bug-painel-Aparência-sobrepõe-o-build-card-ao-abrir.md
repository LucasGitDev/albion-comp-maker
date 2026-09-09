---
id: ACM-095
title: 'Bug: painel Aparência sobrepõe o build card ao abrir'
status: In Progress
assignee: []
created_date: '2026-09-09 02:31'
updated_date: '2026-09-09 03:09'
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
<!-- SECTION:NOTES:END -->
