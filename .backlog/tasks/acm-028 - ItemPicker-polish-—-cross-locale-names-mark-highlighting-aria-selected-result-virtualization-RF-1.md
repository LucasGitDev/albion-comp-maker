---
id: ACM-028
title: >-
  ItemPicker polish — cross-locale names, mark highlighting, aria-selected,
  result virtualization (RF-1)
status: In Review
assignee: []
created_date: '2026-09-07 17:03'
updated_date: '2026-09-07 17:10'
labels: []
milestone: m-2
dependencies:
  - ACM-008
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Closes the doc-002 §3.2/§5.7/§7 gaps deliberately deferred by ACM-008 (see its review findings — LOW items). Scoped entirely inside `src/components/item-picker/**`; does not touch the store or editor.

Add to the existing ItemPicker/ItemResultList:
- A `value: string | null` prop (currently missing) carrying the uniquename of the item equipped in the slot the picker was opened for. The row matching `value` renders `aria-selected="true"` (doc-002 §5.7/§7); all other rows `aria-selected="false"`. Keyboard highlight continues to be conveyed only via `aria-activedescendant`, never by setting `aria-selected` on the highlighted-but-not-equipped row.
- Cross-locale secondary name: when a result's text match came from the non-active locale, render the matched name in muted text next to the primary name (`Bloodletter · Sanguinário`).
- `<mark>`-highlighted substring for the matched query token in the displayed name(s), first occurrence per token only, styled (not default yellow) per doc-002 §8 `--color-picker-match`.
- Result list virtualization when `results.length > 40`, fixed 44px row height, overscan 8 rows (hand-rolled window or `@tanstack/react-virtual`). Each rendered `<li>` must carry explicit `aria-setsize={results.length}` and `aria-posinset` since virtualization breaks the implicit values.

File scope: `src/components/item-picker/**` and its tests only. The `value` prop addition changes ItemPicker's public API — coordinate with the sibling task "Wire ItemPicker into editor" (ACM-027), which is the caller that will pass `value`; that task can proceed independently as long as ItemPicker keeps accepting an optional `value` (default null/undefined does not break ACM-008's existing call sites).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Passing value={someUniquename} to ItemPicker renders aria-selected="true" on the matching result row and aria-selected="false" on all others, while the keyboard-highlighted row (aria-activedescendant target) is a visually distinct state and does not itself get aria-selected="true" unless it is also the equipped item
- [x] #2 A query that matches an item only through its non-active-locale name renders that matched name as visible muted secondary text next to the primary active-locale name (e.g. searching pt-BR term shows the en-US name as secondary), covered by a test
- [x] #3 The matched substring of the query token is wrapped in a <mark> element in the rendered name, first occurrence only per token, covered by a test asserting the <mark> content
- [x] #4 A search that yields more than 40 results renders only a windowed subset of <li> elements (not all N), and every rendered <li> carries aria-setsize equal to the full result count and a correct aria-posinset, covered by a test with a synthesized >40-result query
- [x] #5 make check passes on the task branch (lint, tsc --noEmit, next build, vitest); existing ACM-008 item-picker tests still pass unmodified except where they must be updated for the new value prop default
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented inside src/components/item-picker/** only, per file scope.

- Added ItemPicker `value?: string | null` prop (defaults to null), passed through to
  ItemResultList. This is the contract ACM-027 depends on. Full new ItemPickerProps:
  `{ slot, items, onSelect, onClose, value?, locale?, label?, className? }`.
- ItemResultList row `aria-selected` is now `item.uniquename === value` (was always false).
  Keyboard highlight remains conveyed only via `aria-activedescendant` + row background
  (`bg-[#232833]`); the equipped row additionally gets a left accent bar
  (`before:bg-[#c8a24a]`) and a trailing check glyph, kept visually/semantically distinct
  from the highlight state, per doc-002 5.7/7.
- New src/components/item-picker/highlight.ts (pure, no React): extractTextTokens (strips
  tier/enchant tokens from the raw query), findMatchRanges/segmentName (first-occurrence
  <mark> ranges via normalizeSameLength + String.indexOf — no RegExp is ever built from the
  query, so regex-special characters in a typed token cannot throw or behave unexpectedly),
  matchesOnlyOtherLocale (drives the "Bloodletter · Sanguinário" secondary name). This
  duplicates the small tier/enchant regexes and SEARCHED_LOCALES list already in
  src/lib/item-index.ts rather than modifying that file (out of scope) or exporting new
  internals from it — same pattern as ACM-008's tierOf() duplication in item-result-list.tsx.
- ItemResultList now hand-rolls windowing (no new dependency) when results.length > 40:
  fixed 44px rows, overscan 8, spacer <li aria-hidden> elements before/after the rendered
  window to preserve scrollHeight, and every rendered <li> keeps aria-setsize={results.length}
  (unaffected by windowing) with a correctly offset aria-posinset. An effect nudges
  containerRef.scrollTop toward the active index when it moves outside the current window, so
  keyboard nav to off-screen rows keeps working post-virtualization; default viewport height
  falls back to 420 (matching max-h-[420px]) since jsdom reports clientHeight=0.
- Colors are HEX literal arbitrary Tailwind values (#f5d98a match, #6b7280 muted, #c8a24a
  accent), consistent with ACM-008's precedent of not adding --color-picker-* tokens to
  src/app/globals.css (out of scope, src/app/**).
- twohanded continues to be read verbatim from AOItem.twohanded; untouched by this task.

Deviation: had to update one assertion in the pre-existing
"debounces the query before filtering results" test (item-picker.test.tsx) from
`getByText("Sacred Hammer")` to a textContent-based matcher, because wrapping the matched
substring in <mark> splits the name across sibling nodes and Testing Library's default
getByText only concatenates direct text-node children (a well-documented RTL limitation, not
a behavior change) — same fix applied consistently in the new tests. No other existing
ACM-008 test was touched.

make check: 85/85 tests green, lint/tsc/build clean.
<!-- SECTION:NOTES:END -->
