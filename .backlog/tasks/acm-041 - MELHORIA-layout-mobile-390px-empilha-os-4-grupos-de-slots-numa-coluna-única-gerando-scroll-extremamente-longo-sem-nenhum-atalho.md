---
id: ACM-041
title: >-
  MELHORIA: layout mobile (390px) empilha os 4 grupos de slots numa coluna única
  gerando scroll extremamente longo sem nenhum atalho
status: In Review
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 20:45'
labels: []
dependencies: []
priority: medium
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Em 390px, /build/new empilha Armas, Armadura, Utilidade e Consumíveis verticalmente em uma única coluna com 9 cards grandes, resultando em uma página de ~2200px de altura para rolar. Não há nenhum sumário fixo, tabs, ou accordion para navegar entre grupos, nem indicação de progresso (quantos slots já preenchidos). Ação: considerar tabs horizontais fixas por grupo em mobile, ou accordion colapsável, reduzindo a rolagem necessária para montar uma comp completa no celular.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented per doc-005 (approved spec), no redesign:
- SlotCard: w-[168px] -> w-full md:max-w-[168px] on all 3 states (empty/filled/locked). Desktop pixel-identical since the max-width pins it to 168px wherever available width >=168px (always true at md+).
- SlotGrid: outer container flex-col -> md:flex-row md:flex-wrap; each group wrapper grid grid-cols-2 -> md:flex md:flex-col; group heading gets id=slot-group-<id> + tabIndex=-1 + scroll-mt-[var(--group-nav-h)].
- SLOT_COLUMNS (types/build.ts) gained a stable ASCII `id` slug per group (armas/armadura/utilidade/consumiveis) used for anchor ids.
- New SlotGroupNav component: sticky z-10 strip, real <a href="#..."> chips (never tabs/buttons), aria-current="location" via IntersectionObserver scroll-spy (guarded for missing IntersectionObserver), focus() on the target heading after native anchor scroll (preventScroll: true). Swaps gets its own anchor via a wrapper div (id=slot-group-swaps, tabIndex=-1) in page.tsx rather than modifying SwapsSection, per doc-005 §9 ("SwapsSection inalterado").
- New --group-nav-h: 44px token in globals.css, plus html { scroll-behavior: smooth } (already deferred to `auto` by the existing prefers-reduced-motion block).
- Denominator logic (page.tsx groupCounters/totalReachableSlots): a locked offhand is excluded from both its group's and the global total — verified by test that a two-handed build shows Armas 1/1 and global 1/9, never 1/10 or stuck below 9/9.
- EditorActionBar's totalSlots prop was NOT touched (out of scope, ACM-065's job) — its counter and the new strip's counters can legitimately disagree on screen until ACM-065 aligns it. Documented in code comment at the groupCounters derivation.

Tests added: slot-card-fluid-width.test.tsx, slot-grid-2up.test.tsx, slot-group-nav.test.tsx, build-new-page-group-nav.test.tsx (denominator exclusion, anchor focus movement, picker focus trap still works with the strip mounted inside the inert wrapper).

make check: green (lint, tsc --noEmit, next build, 340/340 tests). One unrelated flaky perf test (item-index.test.ts "builds the full 2036-item index in a single fast pass") failed once under load and passed on retry in isolation — not touched by this task.

PR: https://github.com/LucasGitDev/albion-comp-maker/pull/43

CODE REVIEW (PR #43, correctness/regression focus) — VERDICT: LGTM

Empirically verified (not just diff-reasoned):

1. Persisted-state drift (TOP PRIORITY): CLEARED. SLOT_COLUMNS (types/build.ts) is
   a pure UI layout constant — only referenced by SlotGrid.tsx and build/new/page.tsx,
   never by src/lib/build-schema.ts or any actions/*. BuildState/EquippedItem (the
   actual persisted shape) are byte-identical pre/post diff. `make check` runs the
   full 340-test suite green, including whatever build-schema round-trip tests
   already exist; no legacy-payload-unloadable class of bug (ACM-031's prior
   incident) is possible here since the persisted schema file has zero diff.

2. Global scroll-behavior:smooth in globals.css: verified the existing
   `@media (prefers-reduced-motion: reduce)` block does contain
   `scroll-behavior: auto !important` on `*, *::before, *::after` (not just
   animation/transition durations as I suspected before checking) — the
   implementer's claim holds. Checked for interference with export/capture path
   (src/lib/export-png.ts, html2canvas usage) and the item-picker's own scroll
   (item-result-list.tsx uses local `el.scrollTop`, unrelated to `html`
   scroll-behavior) — no interaction found.

3. --group-nav-h: 44px is consumed identically in all 3 places (SlotGroupNav's
   `getComputedStyle` read for rootMargin, SlotGrid's heading
   `scroll-mt-[var(--group-nav-h)]`, and the swaps wrapper's same class) — no
   hardcoded duplicate found via grep.

4. SlotCard: `w-[168px]` -> `w-full md:max-w-[168px]` confirmed on all 3 states
   (locked/empty/filled) via diff; test file exercises all 3 and passes.

5. Anchor chips are real `<a href="#...">`, `aria-current="location"`. Grepped
   the whole nav for `role="tab"`/`aria-selected` — none found. No tab/accordion
   pattern introduced.

6. Focus management: mutation-tested by hand — commented out
   `target?.focus({ preventScroll: true })` in SlotGroupNav.tsx and re-ran the
   two focus-assertion test files: 3 of 9 tests failed as expected (focus stayed
   on <body>/click target instead of moving to the heading). Restored the file
   after. The tests are real, not tautological.

7. IntersectionObserver guard (`typeof IntersectionObserver === "undefined"`)
   is inside a client-only `useEffect`, so it cannot run during SSR; degrades to
   "no chip ever active, links still work" per spec §8, matches test coverage.

8. Two-handed/locked-offhand denominator: ran the actual fixture test
   (`build-new-page-group-nav.test.tsx`, real store + real page, item catalogue
   mocked only) — "1/9" and "Armas 1 de 1" assertions pass against the real
   `groupCounters`/`totalReachableSlots` logic, not a mock of it.

9. Focus-trap regression: confirmed via diff that `SlotGroupNav` is mounted
   inside the same `<div inert={pickerOpen}>` wrapper as `SlotGrid`
   (build/new/page.tsx). The dedicated test opens the picker and walks up from
   a strip chip asserting an inert ancestor — passes in the full run.

10. Scope: `git diff main...HEAD --name-only` = exactly the 4 non-test source
    files claimed (types/build.ts, globals.css, SlotCard.tsx, SlotGrid.tsx,
    build/new/page.tsx) + new SlotGroupNav.tsx + 4 new test files. No
    package.json/lockfile churn, no touch to EditorActionBar, SwapsSection
    (wrapped only, its own file untouched), src/lib/**, src/app/comp/**.
    `make check` green on the branch: lint, tsc --noEmit, next build,
    340/340 vitest.

Non-blocking note: doc-005 (the approved spec) was committed to master in
commit 39614ca, which lands *after* this task branch diverged — it is absent
from `.backlog/docs/` on task/41-mobile-slot-layout itself. Had no functional
impact (content matches implementation, verified by reading it from the
master worktree), but flagging so future branches rebase docs before
finalizing to avoid reviewers hitting a missing file.

No CRITICAL/HIGH findings. LGTM.
<!-- SECTION:NOTES:END -->
