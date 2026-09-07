---
id: ACM-037
title: >-
  IMPORTANTE: editor de build não tem header, navegação, nem ação primária
  (salvar/exportar) visível
status: In Progress
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 20:42'
labels: []
milestone: m-3
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

Implementação (correção de premissa confirmada: Header.tsx já existia e já era montado no root layout).

O QUE FOI FEITO:
- Header.tsx: virou contextual por rota via usePathname — CTA 'Nova build' some em /build/* e dá lugar a um slot de conta (Entrar/nome, com skeleton enquanto a sessão resolve, via fetch direto em /api/auth/session — sem SessionProvider, para não exigir novo contexto global nem quebrar o teste existente que renderiza NewBuildPage isolado). Sem flex-wrap (uma linha fixa, --header-h-sm/--header-h). Nav com aria-current. Sombra só após rolar. z-30. Disclosure mobile (⋮) só aparece quando há rota além de Home — hoje não há (/builds não existe), então fica oculto por design. Em rota de editor + mobile o header vira static (md:sticky).
- BuildHeader.tsx: perdeu border-b e o contador de slots (virou bloco de identidade com <h1 discreto>). data-testid="slot-count" migrou para EditorActionBar.
- EditorActionBar.tsx (novo): sticky top-[var(--header-h)] em desktop, fixed bottom-0 (com safe-area) em mobile, z-20. Máquina de estados idle-inválido/idle-válido/saving/saved/error com um único aria-live. Salvar como aria-disabled+focável com motivo textual. Auth gate no clique (fetch /api/auth/session), não na entrada da rota (decision-012/D3) — abre painel ancorado com Entrar/Agora não, foco retorna ao botão Salvar. Exportar PNG reaproveita a LÓGICA de src/lib/export-png (exportNodeToPng/downloadDataUrl/buildExportFilename) mas não o styling do ExportBar (que usa bg-blue-600/bg-white/border-neutral-300/text-neutral-900, fora do sistema — ACM-047 é quem deve limpar isso). Estruturalmente irmã do preview: captureNodeRef não está anexado a nenhum nó real hoje porque BuildCard/#capture-root ainda não está wired em /build/new (isso é ACM-018/019, fora de escopo) — "Exportar PNG" reporta corretamente "Card não está pronto para exportar." em vez de fingir sucesso.
- Breadcrumb.tsx (novo): <nav aria-label="Trilha"> com Link real para "/" (não router.back()), aria-current no item atual.
- layout.tsx: skip link "Pular para o conteúdo" antes do Header; main do editor recebeu id="main-content".
- globals.css: tokens --header-h/--header-h-sm, --color-icon-error-fg (texto de erro legível, distinto do --color-icon-error que é um fill), e uma regra global @media (prefers-reduced-motion: reduce).
- Escala de z-index adotada: action bar 20 / header 30 / painéis (mobile nav, auth gate) 40 / SlotPickerPopover 50 (já estava em 50, não mexi).

TESTES NOVOS: src/__tests__/header.test.tsx (presença de landmarks, CTA contextual, aria-current) e src/__tests__/editor-action-bar.test.tsx (disabled com motivo, save disparando onSave, gate de auth, export via #capture-root, testid slot-count migrado, invariante estrutural de nunca envolver #capture-root). export-bar.test.tsx não foi tocado (guard do ACM-029 não foi relaxado).

O QUE FICOU DE FORA (documentado, não escondido):
- Persistência real do "Salvar" (Server Actions/DB) é ACM-018/019, fora de escopo — onSave é injetado pela página como stub (Promise.resolve) até essa task existir. Não persiste rascunho no localStorage durante o redirect de OAuth (D3 menciona isso mas exigiria decisão de escopo do BuildState, deixado para ACM-018/019).
- Guard de hover `[@media(hover:hover)]` (presente só no ExportBar hoje) não foi replicado nos novos botões — polish menor, não bloqueante.
- Breakpoint de colapso do logo (ACM/Albion Comp Maker) usa `sm:` (640px) do Tailwind em vez dos 480px literais do doc-004, para não introduzir breakpoint customizado.

make check verde (206 testes, lint 0 erros/2 warnings pré-existentes em ItemIcon/SpellIcon fora de escopo, build ok).

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
