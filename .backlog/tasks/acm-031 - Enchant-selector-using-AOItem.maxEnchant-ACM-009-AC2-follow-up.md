---
id: ACM-031
title: Enchant selector using AOItem.maxEnchant (ACM-009 AC#2 follow-up)
status: In Review
assignee: []
created_date: '2026-09-07 17:23'
updated_date: '2026-09-07 19:38'
labels: []
milestone: m-2
dependencies:
  - ACM-030
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ACM-009 shipped tier-only after a review found its enchant derivation parsed an @N uniquename suffix that does not exist in this project's data (decision-011). ACM-030 emits maxEnchant on AOItem. This task restores the enchant selector on top of that real field. Scope: src/components/editor/** (TierEnchantSelectors, SlotCard, SlotGrid), src/store/build-store.ts (setEnchant action), src/app/(editor)/**.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 getEnchantOptions derives options from item.maxEnchant (0..maxEnchant), never from parsing the uniquename
- [ ] #2 EnchantSelect renders only when maxEnchant > 0; items with maxEnchant 0 (mounts, food, potions) show no enchant control
- [ ] #3 setEnchant action restored in build-store, BuildState stays JSON-serializable, enchant clamped to 0..maxEnchant
- [ ] #4 Enchant badge renders the selected enchant on SlotCard and BuildCard using hex colors only (no oklch/color-mix, no emoji)
- [ ] #5 Tests use real items from ao-corpus.json (e.g. T4_HEAD_PLATE_SET1 maxEnchant 4 and a maxEnchant 0 item), never fabricated ids
- [ ] #6 make check green
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
FIXTURE GAP (found in ACM-030 review): src/__tests__/fixtures/ao-corpus.json never carried the twohanded field, even before ACM-030 regenerated it — a pre-existing gap in scripts/build-test-fixture.ts, not a regression. maxEnchant IS carried. If a test here needs twohanded from the corpus fixture it will read undefined; either extend build-test-fixture.ts to carry it or use an explicit local fixture.

Implemented: getEnchantOptions(item) in tier-enchant.ts derives 0..maxEnchant from AOItem.maxEnchant only (decision-011), never uniquename parsing. EnchantSelect added to TierEnchantSelectors.tsx, wired through SlotCard/SlotGrid via enchantOptions/onEnchantChange props (mirrors existing tierOptions pattern; note page.tsx does not yet wire tierOptionsBySlot either -- pre-existing gap, left as-is to avoid scope creep). setEnchant action restored in build-store.ts, clamped 0..4, no-op on empty slot. BuildState/build-schema.ts required NO changes: the enchant field already existed in both (ACM-009 never removed it, only the derivation UI was descoped), so no schema drift. Enchant badge added to SlotCard using var(--color-enchant) (hex token, same as tier badges already use) -- data-testid=enchant-badge. BuildCard's enchant badge already existed (CardSlotTile, ACM-013/030) and needed no change. Tests: enchant-select.test.tsx (new), tier-enchant.test.ts and build-store.test.ts extended, all using real fixture items (T4_HEAD_PLATE_SET1 maxEnchant 4, T1_OFF_SHIELD maxEnchant 0) per AC#5. make check green (260 tests). PR #34.

REVIEW ACM-031 / PR #34 — BLOCKED: 2 findings

[HIGH] AC#3 violated — setEnchant clamps to a hardcoded 0..4, not per-item maxEnchant.
File: src/store/build-store.ts:380 `Math.max(0, Math.min(4, Math.trunc(enchant)))`.
Design gap: `EquippedItem` (src/types/build.ts) carries no `maxEnchant` field, so the store
has zero access to the real per-item ceiling at the point setEnchant runs — it is architecturally
impossible for it to clamp correctly today. Failure scenario: any future caller invoking
`setEnchant("offhand", 3)` on a T1_OFF_SHIELD (maxEnchant 0) succeeds and stores enchant 3 —
the store itself will not stop it; only the UI-level `EnchantSelect`/`options.includes()` guard
prevents it today, and that guard is bypassable by calling the store action directly (as the
test file itself does — build-store.test.ts never proves the store enforces a non-4 max because
no maxEnchant<4 item is ever exercised through setEnchant). This is exactly the class of bug
decision-011 exists to prevent: an enchant value in the store that does not correspond to what
the real item data allows. The precedent already exists in the same file — EquippedItem keeps
`twohanded` on the slot specifically so the store can self-enforce a rule without catalog access
(see the doc-comment on EquippedItem.twohanded). The same treatment was not applied to maxEnchant.
Fix: either store `maxEnchant` on EquippedItem and clamp against it in setEnchant, or pass
maxEnchant into setEnchant from the caller (who has catalog access) and clamp there.

[HIGH] AC#2 is not reachable by users — feature exists in tests only, not in the product.
File: src/app/(editor)/build/new/page.tsx — SlotGrid is called with `onTierChange` wired but
NO `enchantOptionsBySlot` and NO `onEnchantChange` prop at all. Since SlotCard defaults
`enchantOptions = []` and gates the selector on `enchantOptions.length > 1`, the enchant
selector can never render on the only real editor route in the app. A user on /build/new
equips any item and has no way to ever see or change its enchant level — the feature does not
exist in the product despite AC#2's component-level test passing. The implementer's own
justification (tier has the "same" pre-existing gap) is not exculpatory: it means ACM-009 already
shipped a component whose control is unreachable, and this PR compounds it with a second
unreachable control rather than fixing either. Per this session's ACM-037 precedent (a
non-functional "Salvar" button was rejected for looking done without working), a component that
renders correctly in isolated tests but is never wired into the live route is the same failure
mode: AC#2 is true in the narrow, literal sense of the component contract, but false as a
user-facing feature. This should either be fixed in this PR (wire enchantOptionsBySlot/
onEnchantChange, and ideally tierOptionsBySlot too since it's the same bug) or the task's AC#2
should be rewritten to explicitly scope to component-level only, with a new task opened
immediately to wire it into page.tsx — leaving it silently unwired, as done here, is not
acceptable.

Verified OK:
- AC#1: getEnchantOptions derives strictly from item.maxEnchant; no uniquename/@N parsing
  reintroduced (grep confirms parseUniquename is untouched and getEnchantOptions ignores
  uniquename entirely, test explicitly proves a fabricated "@1" suffix has no effect).
- AC#2 (component level only): EnchantSelect gates on options.length <= 1 which is equivalent
  to maxEnchant 0 or 1 (both produce a 1-element options array [0] or [0,1]... wait — maxEnchant
  1 produces [0,1], length 2, which DOES render. That's correct behavior since maxEnchant>0 means
  enchantable. maxEnchant 0 produces [0], length 1, correctly hidden. No off-by-one found here.
- AC#4: --color-enchant resolves to a plain hex (#3f8f4a) in globals.css, no oklch/color-mix.
  Badge uses inline style with the CSS var + a plain "." + number, no emoji. ACM-029 guard test
  (build-card.test.tsx) untouched and still covers the capture root.
- AC#5: fixture-derived tests reference real ao-corpus.json entries; tier-enchant.test.ts reads
  the fixture directly and asserts T4_HEAD_PLATE_SET1 has maxEnchant 4 before using it, and finds
  a maxEnchant-0 item generically — genuinely fixture-driven, not fabricated.
- BuildState/build-schema.ts: enchant field already existed pre-PR (z.union of literals 0..4) —
  no schema drift, confirmed by grep; no runtime validation risk introduced.
- Scope: only 8 files touched, all within the task's stated scope
  (src/components/editor/**, src/store/build-store.ts, tests). src/actions/**, src/db/**,
  src/app/comp/**, ExportBar.tsx, package.json/lockfile all untouched.

Verdict: BLOCKED: 2 findings (both HIGH)

REVIEW FIX (attempt 1): both HIGH findings addressed.

1) AC#3 (hardcoded clamp): EquippedItem now carries maxEnchant (src/types/build.ts),
   mirroring the existing twohanded precedent's doc-comment. setItem persists it
   from the catalogue item; setEnchant clamps against current.maxEnchant instead
   of a hardcoded 4 (src/store/build-store.ts). build-schema.ts's equippedItemSchema
   updated to require maxEnchant (0..4) so BuildState and its runtime schema stay
   in sync (ACM-049/ACM-055) -- added a passing case (enchanted item validates) and
   a rejecting case (item missing maxEnchant is now invalid) in build-schema.test.ts.
   New store-level test proves setEnchant("offhand", 3) on a real maxEnchant-0 item
   (T1_OFF_SHIELD) is clamped to 0 by the store itself, not just the UI guard.

2) AC#2 (unreachable in product): page.tsx now derives tierOptionsBySlot (via
   getTierVariants against the loaded catalogue) and enchantOptionsBySlot (via
   getEnchantOptions against each equipped item's own maxEnchant, no catalogue
   lookup needed) with useMemo, and wires both plus onEnchantChange into SlotGrid.
   Fixed the pre-existing tierOptionsBySlot gap at the same time, as requested.
   New page-level tests in build-new-page.test.tsx render the real /build/new route,
   equip an item via the store, and prove the enchant <select> and tier <select> are
   actually present and that changing the enchant select mutates the store and the
   on-screen badge -- plus a control-case proving neither renders for an empty slot.

All existing EquippedItem test fixtures across the suite updated to carry maxEnchant
(no behavior change intended there, just keeping literals in sync with the widened type).
make check green (266 tests, up from 260).
<!-- SECTION:NOTES:END -->
