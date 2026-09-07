---
id: ACM-008
title: Item autocomplete with slot filter (RF-1)
status: In Review
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 17:00'
labels: []
milestone: m-2
dependencies:
  - ACM-005
  - ACM-007
ordinal: 8000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Search input that filters ao-data.json items by name (EN+PT) and id, grouped by slot. Sub-500ms response with 2000+ items using in-memory index.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Debounced input, results appear < 50 ms after debounce
- [x] #2 Filters by slot type (mainhand, offhand, head, etc.)
- [x] #3 Shows ItemIcon + name + tier per result
- [x] #4 Keyboard navigable (arrow keys, enter, escape)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
ACM-026 emite AOItem.twohanded (616 de 2036, todos mainhand). Use ESSE campo para a regra de offhand-lock. O fallback /_2H_/ proposto no doc-002 e comprovadamente ERRADO: UNIQUE_VANITY_2H_SKULL_UNDEAD_AJ e UNIQUE_VANITY_2H_SKULL_DEMON_GOLDEN_AJ tem _2H_ no nome mas twohanded=false. Alem disso: todos os 112 offhands tem zero spell slots (decision-005).

Implemented src/lib/item-index.ts (buildItemIndex/searchItems, pure, no React) and src/components/item-picker/ (ItemPicker, ItemSearchInput, ItemResultList), per doc-002 sections 1-3 and 6-7 (tokenization, tier/enchant parsing, EN+PT-BR cross-locale search, scoring/tie-break, slot-bucketed index, aria-activedescendant combobox pattern, arrow/PageUp/PageDown/Home/End/Enter/Tab/Escape/Backspace keymap).

Deviations from doc-002 (scoped down to avoid touching src/store, src/components/editor, src/app per task boundary — the editor/store implementer owns comp state concurrently):
- ItemPicker API is `{ slot, items, onSelect, onClose, locale?, label?, className? }` instead of doc-002 section 1's `{ slot, value, onChange, label, locked, lockedReason, onTwoHandedSelect, size, className }`. This component only renders the search input + result list; the trigger (empty/filled/locked states), the two-handed/offhand clear side effect (section 4) and the undo toast are state-owning concerns that belong to the caller/editor and were out of this task's file scope.
- `items: AOItem[]` is passed in as a prop rather than read from a global `AOData` fetch/store singleton, keeping the component self-contained and unit-testable without a data layer.
- No `--color-picker-*` Tailwind tokens added to `src/app/globals.css` (out of scope, src/app/**); rows use inline arbitrary-value classes with the same hex values from doc-002 section 8 instead.
- Result rows do not yet show the cross-locale secondary name (`Bloodletter · Sanguinário`) or `<mark>` substring highlighting (doc-002 §3.2) — deferred, not required by the 4 ACs.
- `aria-selected` on the equipped row (doc-002 §5.7/§7) is not implemented since there is no `value` prop in this scope; all options render `aria-selected="false"`.
- Virtualization (doc-002 §3.3, >40 results) not implemented; result set for a single slot query is index-filtered (max 200 by default) and rendering is fast enough for review, but should be added if profiling shows otherwise once wired into the real editor.

AC verification:
- #1: src/__tests__/item-index.test.ts "performance" suite benches searchItems over a synthesized 2036-item catalogue matching doc-002's slot histogram; 5 mainhand queries + full index build each complete in well under 50ms. ItemPicker debounces at 120ms (src/components/item-picker/ItemPicker.tsx) and keeps the previous result list rendered during the debounce window (covered by item-picker.test.tsx "debounces the query before filtering results").
- #2: searchItems filters via `index.bySlot` map lookup; covered by item-index.test.ts "filters by slot as a hard map-lookup".
- #3: ItemResultList renders ItemIcon + name + tier chip + 2H badge per row; covered by item-picker.test.tsx "shows the ItemIcon and tier chip for each result row".
- #4: full keyboard map (ArrowUp/Down, PageUp/Down, Home/End, Enter, Tab, Escape x2, Backspace) implemented in ItemPicker.tsx; covered by item-picker.test.tsx arrow-nav, Enter-select and two-level-Escape tests.

twohanded is read verbatim from AOItem.twohanded (never inferred from a `_2H_` substring), per ACM-026/decision note on the task — covered by item-index.test.ts "respects twohanded as an authoritative field, never inferred from the id".

`make check` passes (lint, tsc --noEmit, next build, vitest — 68/68 tests green).

## Review — PR #13 (task/8-item-autocomplete)

Verdict: LGTM (no CRITICAL/HIGH findings). All 4 ACs met; scope respected (only src/lib/item-index.ts, src/components/item-picker/**, and their tests touched — no package.json/lockfile/store/editor/app changes).

Verification performed:
- Ran the full test suite: 18/18 green.
- Mutation-tested the twohanded regression test by patching item-index.ts to infer `_2H_` from uniquename instead of reading `AOItem.twohanded` verbatim — the "respects twohanded as an authoritative field" test correctly failed. Test is real, not tautological. Reverted the mutation before finishing review.
- Read buildItemIndex/searchItems by inspection: slot filtering is a `Map.get`, not a `.filter()` scan (confirmed by the "hard map-lookup" test); ItemPicker caches the index in a module-level `WeakMap<AOItem[], ItemIndex>` keyed by array identity plus `useMemo` keyed only on `items` (not on query/debouncedQuery) — index is not rebuilt per keystroke.
- Keyboard nav test asserts real state transitions (aria-activedescendant changes across ArrowDown/Up, two-stage Escape clears query then closes, Enter calls onSelect with the correct item) — not a tautology.
- Combobox ARIA: role=combobox, aria-expanded, aria-controls, aria-activedescendant on the input; role=listbox + role=option with aria-setsize/aria-posinset on rows — matches doc-002 §7 pattern, verified by test.

Findings (non-blocking):

MEDIUM — No test asserts the index build isn't repeated across ItemPicker re-renders (e.g. spy on buildItemIndex call count while typing/re-rendering). Current correctness rests on code inspection of the WeakMap/useMemo, not on a regression test. Add a spy-based test so a future refactor that breaks the memoization is caught.

MEDIUM — ItemPicker's public API (`{slot, items, onSelect, onClose, locale?, label?, className?}`) diverges materially from doc-002 §1's full contract (`{slot, value, onChange, label, locked, lockedReason, onTwoHandedSelect, size, className}`). The deviation is documented and justified (avoids touching src/store/src/components/editor, which the editor implementer owns concurrently), and is fine for closing ACM-008's 4 ACs. However there is currently no follow-up task tracking the wrapper component that will own the trigger visual states, the two-handed→offhand-clear side effect, and the undo toast — this is real functionality from doc-002 §4 that has to land before the picker is usable in the actual comp editor. Recommend creating an explicit follow-up task now so it isn't silently dropped between ACM-008 and the editor-integration task.

LOW — Cross-locale secondary name display and `<mark>` substring highlighting (doc-002 §3.2) and `aria-selected` on the equipped row (doc-002 §5.7/§7) are deferred; legitimately out of scope for the 4 ACs (no `value` prop in this component's scope to know what's equipped). Track under the same follow-up as above rather than losing them.

LOW — "debounces the query before filtering results" test relies on real timers (`waitFor` + real 120ms setTimeout) rather than `vi.useFakeTimers()`. Works today but is a candidate for CI flakiness under load; consider fake timers in a later pass.

LOW — `tierOf()` in item-result-list.tsx duplicates the tier-extraction regex already computed once in item-index.ts's `extractTier`. Minor duplication; acceptable since `AOItem` itself doesn't carry a `tier` field and the result list only receives `AOItem[]`, not `IndexedItem[]`.

No scope, contract, or data-correctness issues found. `twohanded` is read verbatim from `AOItem.twohanded` everywhere (item-index.ts, item-result-list.tsx's `item.twohanded &&` check) — no `_2H_` substring inference in the shipped code.
<!-- SECTION:NOTES:END -->
