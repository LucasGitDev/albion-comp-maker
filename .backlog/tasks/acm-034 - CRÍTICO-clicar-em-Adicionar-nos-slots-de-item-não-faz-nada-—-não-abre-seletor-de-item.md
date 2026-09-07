---
id: ACM-034
title: >-
  CRÍTICO: clicar em 'Adicionar' nos slots de item não faz nada — não abre
  seletor de item
status: In Review
assignee: []
created_date: '2026-09-07 17:36'
updated_date: '2026-09-07 18:15'
labels: []
dependencies: []
priority: high
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Em /build/new, clicar no texto 'Adicionar' de qualquer slot (mão principal, cabeça, etc.) apenas aplica um outline verde de foco no card, sem abrir modal/dropdown/autocomplete de seleção de item. Isso quebra o fluxo principal do produto: o guild leader não consegue montar a comp. Testado em Chromium headless via Playwright, clique não dispara nenhuma UI de busca. Ação: implementar o picker de item (modal ou popover com busca/autocomplete) ao clicar em qualquer slot vazio ou preenchido.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Clicar em um slot vazio ('Adicionar') abre o ItemPicker daquele slot
- [ ] #2 Clicar em um slot preenchido (na área do ícone/nome, não no botão de limpar) reabre o ItemPicker com value = itemId atual
- [ ] #3 Selecionar um item no picker grava no slot correto do build-store e fecha o picker
- [ ] #4 Esc e clique fora fecham o picker sem alterar o slot
- [ ] #5 Slot offhand travado por arma de duas mãos NAO abre o picker
- [ ] #6 ACM-027 fica subsumida por esta task (mesma causa raiz: handleRequestItemPick era no-op)
- [ ] #7 Teste automatizado cobre: abrir picker por slot vazio, selecionar item, store atualizado, picker fechado
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Root cause: handleRequestItemPick in build/new/page.tsx was a deliberate no-op. Fixed by adding activeSlot state + new SlotPickerPopover modal shell wrapping the existing ACM-008 ItemPicker, plus a lazily-loaded useItemCatalogue hook (module-cached, non-literal import specifier so build doesn't break when src/data/ao-data.json is absent — gitignored/pipeline artifact, known cross-task gap per ACM-027 notes). SlotCard's filled state gained a dedicated clickable icon/name button (kept separate from the clear button) to reopen the picker with value=current itemId. offhandLocked is now threaded from the page into SlotGrid so the locked offhand never renders an interactive control. ACM-027 subsumed (identical root cause). Tests: src/__tests__/build-new-page.test.tsx, src/__tests__/slot-card-picker.test.tsx. make check green (lint/tsc/build/vitest 139 passing). PR #25.

REVIEW PR #25 (task/34-wire-itempicker) — BLOCKED: 4 findings

[CRITICAL] src/components/editor/use-item-catalogue.tsx:20-45 — the fix is fake in production.
`loadCatalogue()` does a dynamic `import(/* turbopackIgnore */ "@/data/" + "ao-data.json")` specifically
so `next build`/tsc never resolve it statically. The file's own docstring admits "nothing serves
@/data/ao-data.json to the browser, so the import always rejects and we fall back to an empty
catalogue". Confirmed: `src/data/ao-data.json` does not exist on origin/main (gitignore:48, pipeline
artifact) and `.github/workflows/check.yml` never runs `pnpm sync:ao` (only nightly-ao.yml does, on
a separate unrelated schedule). Concrete failure scenario: fresh checkout or CI, user opens any
empty slot -> SlotPickerPopover mounts -> ItemPicker receives items=[] -> ItemResultList renders the
exact same empty state as "no search results" (src/components/item-picker/item-result-list.tsx —
no distinct "run the pipeline" or error message) -> user can never select any item. ACM-034 AC#3
("selecting an item writes to the correct slot") is unverifiable end-to-end in the actual product;
it only passes because both new tests (build-new-page.test.tsx, and implicitly the picker flow)
vi.mock the entire use-item-catalogue module with a hand-built non-empty item list, so the real
dynamic-import/empty-catalogue path is never exercised by any test. The `loading` flag returned by
the hook is destructured away (`const { items } = useItemCatalogue()` in page.tsx) and unused, so
there isn't even a loading spinner masking the gap — the picker just silently opens onto an empty
list forever. This makes the "critical bug fixed" claim false for the only environment (fresh
checkout / CI / any deploy without a manual local sync:ao run) that matters. Action needed: either
wire a real fetch path (API route or public/ static asset) for ao-data.json before merge, or make
the empty-catalogue state visibly say so (not indistinguishable from "no results"), and add a test
that exercises the real loadCatalogue() failure path, not just a mocked hook.

[CRITICAL] Stale branch / guaranteed merge damage to already-shipped feature. PR #23
(task/10-spell-picker, ACM-010) merged to origin/main at 43e473c, BEFORE this branch's tip. This
branch (task/34) is based on 911fd52, an ancestor that predates the spell-picker merge. Verified
with `git merge-tree`: both src/components/editor/SlotCard.tsx and
src/app/(editor)/build/new/page.tsx show real conflicting hunks between main's already-merged
SpellPicker changes (onSpellChange prop, <SpellPicker .../>, import) and this branch's untouched
copy of the pre-#23 file (SpellIcon/spellGroups block). This is not a hypothetical "watch out on
rebase" — merging PR #25 as-is (or via GitHub's default merge) will either produce merge conflicts
that a rebase-blind merge could resolve wrong, or silently regress the shipped ACM-010 spell-picker
UI if resolved naively favoring "theirs". Action: implementer must rebase task/34 onto current
origin/main and re-verify SlotCard.tsx still renders the SpellPicker (not the old SpellIcon list)
before this can be reviewed again.

[HIGH] src/components/editor/SlotPickerPopover.tsx — new modal surface has no focus trap and no
focus-return. Only an initial `input.focus()` on mount; nothing prevents Tab/Shift+Tab from moving
focus out of the dialog into the page behind the backdrop, and nothing restores focus to the slot
button that opened the picker when it closes (no ref to the trigger element, no .focus() call in
onClose/cleanup). Concrete scenario: keyboard-only user opens the picker on the head slot, presses
Tab repeatedly, focus leaves the dialog into background page content (which is still interactive —
no inert/aria-hidden applied to `<main>`), and after Esc/selection focus is lost to <body> instead
of returning to "Alterar Cabeça". This is a real accessibility regression for new surface, not
pre-existing debt (the previous ItemPicker was inline/uncontrolled, this is the first modal).

[HIGH] Same SlotPickerPopover — no scroll lock / inert on background. Backdrop visually covers the
page but nothing sets `overflow:hidden` on body or `inert`/aria-hidden on the rest of the tree, so
screen-reader users can navigate into background slot cards while the picker is "open", and mouse
wheel still scrolls the page underneath a fixed-position modal.

Verified passing (no finding):
- AC#1/#2/#4/#5 structurally correct: empty slot opens (SlotCard button -> onRequestItemPick),
  filled slot reopens with value=current itemId without the clear (x) button triggering it (separate
  button elements, tests assert this correctly with real onClick assertions, not mocks-only), Esc/
  outside-click close without mutating store (real store assertions in build-new-page.test.tsx), and
  offhand lock is enforced structurally in SlotCard (locked branch renders a plain div with no
  onClick at all, not just a disabled-looking button) — SlotGrid passes
  locked={slot==="offhand" && offhandLocked} correctly.
- ACM-035 AC#1/#2/#3: empty slot renders SlotPlaceholderIcon (category silhouette), never mounts
  ItemIcon with itemId="" for empty slots; filled slot still uses ItemIcon via item.itemId. Tests
  assert this on real rendered output, not mocks.
- Store-subscription-boundary invariant preserved: SlotCard, SlotPickerPopover and
  use-item-catalogue.tsx do not import the store; only build/new/page.tsx calls useBuildStore.

Verdict: BLOCKED: 4 findings (2 CRITICAL, 2 HIGH). Loop attempt should be counted; return to
implementer with these four items named above.

Attempt 2 fix (folded ACM-043 in): added GET /api/items (fs-based, same pattern as /api/icon) serving the item catalogue from src/data/ao-data.json server-side; the previous client-side dynamic import (@/data/ + ao-data.json with turbopackIgnore) was never a real fetch path -- browsers cannot resolve a build-time alias as a runtime module specifier, so it 404'd every time and silently fell back to []. Route returns only the fields ItemPicker/SlotCard use, drops the unused top-level spells registry, and gzips in-route (App Router route handlers get no compression from next start/Next's `compress` option): raw items ~2.0MB -> gzip ~62.7KB transferred, verified via curl against a production build. Missing-artifact and malformed-artifact cases return a typed 503 {code:"CATALOGUE_UNAVAILABLE"}, never a crash or silent empty list.

useItemCatalogue now exposes {items, loading, failed} with failed distinct from an empty successful load. SlotPickerPopover surfaces visible loading (spinner) and failed (alert with `npm run sync:ao` instructions) states instead of the sole sr-only status, and no longer discards `loading`/`failed` in page.tsx.

Also fixed (follow-up review HIGH/MEDIUM): real focus trap (Tab/Shift+Tab cycle within the dialog, tested), focus restored to the exact trigger element on close (captured in the click handler before the background is marked inert -- reading document.activeElement from an effect inside the popover is too late since an inert ancestor force-blurs synchronously in the same commit), background scroll locked via document.body.style.overflow and background content marked `inert` while the dialog is open.

End-to-end verified via Playwright against a production build (`next build && next start`): opened /build/new, searched "sword" in the mainhand slot, selected T8_2H_DUALSWORD, it landed in the slot with a real icon from /api/icon (CDN fetch succeeded, 217x217 PNG). Also verified /api/items returns 2036 items and the gzip path (content-encoding: gzip, 62683 bytes) end-to-end.

Merged origin/main into the branch (not rebased -- the branch already contains a merge commit reconciling the ACM-010 SpellPicker refactor; rebasing replayed and re-triggered that already-resolved conflict) to pick up unrelated backlog-status commits; only conflict was in this task's own backlog notes (timestamps/review text), resolved by keeping both. PR #25 verified CLEAN/MERGEABLE after push. make check green (166 tests).

Final review (attempt 2) of PR #25 branch task/34-wire-itempicker: LGTM.

All 5 previously-blocking findings verified fixed in code + tests:
1. Runtime-unresolvable dynamic import replaced by src/app/api/items/route.ts (Node fs), no silent .catch(()=>[]) swallow.
2. loading/failed states now surfaced end-to-end (useItemCatalogue -> SlotPickerPopover) with visible UI for each.
3. Real Tab-cycle focus trap in SlotPickerPopover (verified via slot-picker-popover-a11y.test.tsx, jsdom-real not mocked).
4. Focus restored to trigger button on close; capture happens synchronously in the click handler in page.tsx BEFORE inert/re-render, so not fragile to render ordering.
5. Background scroll locked + marked inert while picker open.

Scrutinized claims, all hold up:
- Gzip only sent when Accept-Encoding includes gzip; plain body otherwise. Round-trip verified by test (gunzip decodes back to original items).
- Cache-Control: public, max-age=31536000, immutable is sane for a build-time artifact that only changes via redeploy. In-memory module-scope cache of parsed items/json/gzip avoids re-reading the 2MB file and re-gzipping per request; correctly scoped to the process lifetime.
- 503 CATALOGUE_UNAVAILABLE path: ENOENT and malformed-JSON (JSON.parse throw) both caught by the same try/catch, both typed 503s; dedicated malformed-artifact test exists. Client maps any non-2xx to the failed state, never an empty list.
- Field stripping: twohanded, maxEnchant, and per-item spells (already resolved incl. localizedNames per AOItem.spells) all preserved on the wire; only the redundant top-level spells registry is dropped. Nothing SlotCard/SpellPicker needs is missing.
- ACM-010 SpellPicker/spell-groups.ts confirmed present and untouched by this diff post-merge -- not regressed.
- Single store subscription preserved: only page.tsx calls useBuildStore; SlotCard/SlotGrid take plain props (grep-verified).
- Tests: 166/166 pass, none skipped/deleted. New hook/route tests exercise real fetch/fs-mocked-at-boundary failure paths (missing artifact, malformed artifact, non-2xx, network reject) -- not tautological mock-of-a-mock tests, this was the exact prior-review gap and it's now closed.
- make check green on task branch (lint/tsc/build/test).
- Scope: only files relevant to ACM-034/035/043 touched.

Non-blocking follow-up (MEDIUM): useItemCatalogue's module-level cache permanently memoizes a failed catalogue fetch for the session lifetime -- a user who opens the picker before npm run sync:ao runs, then re-runs it, needs a full page reload (not just reopening the picker) to recover. Suggest a retry/invalidate-on-reopen follow-up task, not a merge blocker.

Verdict: LGTM.
<!-- SECTION:NOTES:END -->
