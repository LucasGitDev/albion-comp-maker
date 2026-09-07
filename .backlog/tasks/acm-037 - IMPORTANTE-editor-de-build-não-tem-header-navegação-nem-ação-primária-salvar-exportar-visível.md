---
id: ACM-037
title: >-
  IMPORTANTE: editor de build não tem header, navegação, nem ação primária
  (salvar/exportar) visível
status: In Progress
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 19:22'
labels: []
dependencies: []
priority: high
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Em /build/new não existe nenhum header/nav global, breadcrumb, botão de voltar, nem botão de salvar/exportar PNG — a página é só o formulário de nome+papel e a grade de slots, sem chrome nenhum. Um usuário não sabe onde está no fluxo do produto nem como finalizar a comp que está montando. Comparar com https://www.albiononlinebuilds.com/pt/comp/dragon-raid-meele-comp: header fixo com logo/nav/busca/CTA 'Criar', título da comp e tag de categoria (ex: 'PVE GROUP') logo abaixo, botão 'Compartilhar' no canto superior direito da área de conteúdo. Ação: adicionar header persistente com navegação e, na página de edição, uma barra de ação fixa (sticky) com botão primário 'Salvar' / 'Exportar PNG' sempre visível, mesmo com scroll longo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Header global persistente com logo/marca, navegacao (Home, Builds) e CTA primario 'Criar build', presente em todas as rotas via layout
- [ ] #2 Na pagina de edicao de build existe uma action bar sticky sempre visivel durante scroll longo, com acao primaria 'Salvar' e secundaria 'Exportar PNG'
- [ ] #3 Existe caminho de volta explicito a partir do editor (breadcrumb ou botao voltar) sem depender do back do navegador
- [ ] #4 Header e action bar sao navegaveis por teclado, com foco visivel e landmarks semanticos (header/nav/main)
- [ ] #5 A action bar sticky nao aparece dentro do capture-root do export PNG (nao vaza para a imagem exportada)
- [ ] #6 make check verde e testes cobrindo a presenca do header e o disparo das acoes primarias
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SPEC: ver doc-004 'Header global, action bar sticky e navegacao do editor'. CORRECAO DE PREMISSA: a descricao original desta task esta ERRADA — Header.tsx JA existe e JA e montado no root layout, portanto JA renderiza em /build/new. O defeito real e outro: (1) CTA 'Nova build' com destaque accent aparece enquanto o usuario ESTA criando uma build (FINDING 5 da review da ACM-038) — deve virar contextual, suprimido em /build/*, dando lugar ao slot de conta; (2) BuildHeader parece um segundo header — remover border-b e o contador de slots, virando bloco de identidade. O trabalho novo de verdade e a ACTION BAR sticky, nao o header. AC#1 ja esta majoritariamente satisfeito.

Re-review round 2 (PR #31, task/37-header-action-bar) — attempt 1 fix delta.

VERIFIED (empirically, not on faith):
1. Real save: patched handleSave back to `await Promise.resolve()` in the worktree and re-ran build-new-page.test.tsx — both new tests genuinely fail against the no-op (toHaveBeenCalledTimes(1) never satisfied). Restored file, re-ran: 8/8 pass. Error path is real: EditorActionBar catches onSave() rejection and renders "Não deu para salvar." (not a fake success), confirmed via the reject-path test.
2. HIGHEST PRIORITY cross-lane check (ACM-049, PR #33, unmerged): built the exact payload /build/new sends (createEmptyBuild() + a twohanded mainhand item, matching build-new-page.test.tsx's fixture) and ran it through ACM-049's real `validateBuildContentForWrite` from the task-49b worktree (src/lib/build-schema.ts) inside that worktree's own vitest — PASSES cleanly, no throw. Root cause: BuildState (src/types/build.ts) is byte-identical between task-37 and task-49b worktrees, and build-schema.ts has a compile-time anti-drift check (`Exact<z.infer<typeof buildStateSchema>, BuildState>`) tying the schema to that exact type. accent default "#3f8f4a" passes the ^#[0-9a-fA-F]{6}$ regex; store's setItem always populates full EquippedItem shape (spells object with all 4 keys, enchant as 0-4 literal, tier as int). No incompatibility found — whichever of #31/#33 merges second will NOT break saving. Downgrading this from the presumed CRITICAL to: no finding, verified compatible (evidence attached above for future auditors — re-check if either BuildState or the store's setItem shape changes before #33 merges).
3. autoFocus removal: skip link is first focusable element in the DOM (src/app/layout.tsx, before <Header>), and with autoFocus gone from BuildHeader's name input, forward-Tab from load now genuinely lands on the skip link first. This is not a UX regression needing a "better fix" — auto-focusing a form field on route load is itself the anti-pattern (steals focus before AT users get page context); removing it is the correct fix, not a trade-off.
4. MEDIUM — skip-link.test.tsx does not prove the anchor-to-landmark link. It only asserts `#main-content` exists per-page (rendering each page component in isolation, never RootLayout+page together) and separately (in another describe) that focus doesn't land on the name input. No test ever reads the skip link's actual `href` and resolves it against a rendered landmark, nor simulates Tab and checks the resulting focused element is the skip anchor. Currently harmless because both sides hardcode the literal string "#main-content", but a typo in either location would ship green. Recommend: one integration-style test rendering layout output (or asserting `header.querySelector('a[href^="#"]')`'s href.slice(1) equals an element id present in the same tree) before closing out the skip-link line item.
5. 390px status bar: confirmed no truncate/whitespace-nowrap/line-clamp classes remain; status wraps via flex-wrap + min-w-0. slot-count hidden below sm is acceptable — the info is redundant with the visually-inspectable slot grid, not a unique data point.
6. Scope: src/app/builds/page.tsx diff is exactly the landmark attrs (+1/-1 line), confirmed via `git diff origin/main...HEAD`. src/actions/**, src/db/**, package.json, lockfiles: zero changes.
7. `make check` green on task branch: lint (0 errors, 2 pre-existing unrelated <img> warnings), tsc, build, and vitest all pass — 34 test files, 233 tests, 0 skipped.

Verdict: LGTM, with one MEDIUM (item 4, skip-link href/landmark linkage not actually asserted) recorded as debt, not a blocker.
<!-- SECTION:NOTES:END -->
