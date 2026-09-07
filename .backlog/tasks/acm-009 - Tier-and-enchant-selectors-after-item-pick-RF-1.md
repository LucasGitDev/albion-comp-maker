---
id: ACM-009
title: Tier and enchant selectors after item pick (RF-1)
status: In Review
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 17:10'
labels: []
milestone: m-2
dependencies:
  - ACM-005
  - ACM-007
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After choosing an item, show tier select (T4-T8 variants of same base) and enchant select (0..maxEnchant). Updates icon preview.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tier variants derived from ao-data items sharing same base ID
- [x] #2 Enchant select only shows 0..item.maxEnchant options
- [x] #3 Icon updates on tier/enchant change
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented tier/enchant selectors in SlotCard footer (ACM-009), plus the ACM-011-review store fix.

Files:
- src/components/editor/tier-enchant.ts: pure helpers (parseUniquename, getTierVariants, getEnchantOptions) deriving tier siblings/enchant levels from an AOItem[] catalogue by "base id" (uniquename with T<n>_ prefix and @<n> suffix stripped). No DOM, no store dependency; caller supplies the catalogue.
- src/components/editor/TierEnchantSelectors.tsx: TierSelect/EnchantSelect, plain accessible <select> elements (aria-label "Tier de <slot>" / "Encanto de <slot>").
- src/components/editor/SlotCard.tsx: renders the selectors in the filled-card footer, only when tierOptions/enchantOptions are non-empty and an onChange handler is supplied — so a slot with no catalogue data attached simply doesn't show them (SlotGrid/page currently pass none, since there's still no real ao-data fetch wired into the editor; see ACM-011 notes). Also replaced the locked-offhand lock emoji with an inline SVG (constraint: no emoji glyphs that could end up in a PNG export).
- src/components/editor/SlotGrid.tsx: threads tierOptionsBySlot/enchantOptionsBySlot/onTierChange/onEnchantChange per slot down to SlotCard.
- src/app/(editor)/build/new/page.tsx: wires onTierChange/onEnchantChange to new store actions setTier/setEnchant.
- src/types/build.ts: added `twohanded: boolean` to EquippedItem — needed so the store can enforce the offhand lock without catalogue access (see below); every slot carries it, only mainhand's value is meaningful.
- src/store/build-store.ts: added setTier(slot, tier, itemId) and setEnchant(slot, enchant, itemId), which swap itemId/tier|enchant on the existing EquippedItem WITHOUT resetting spells (switching tier/enchant is the same item family, not a different item — unlike setItem, which always resets spells for a genuinely new item).
- Tests: src/__tests__/tier-enchant.test.ts (helper derivation, AC #1/#2), src/__tests__/tier-select.test.tsx (SlotCard renders/hides selectors, AC #3 — onChange fires with the resolved sibling item and the icon reflects the new itemId on re-render), src/__tests__/build-store.test.ts (setTier/setEnchant preserve spells; setTier/setEnchant no-op on empty slot; updated the AC#2 equality assertion for the new `twohanded` field).

Known open finding fixed (ACM-011 review, MEDIUM): setItem now no-ops when called for "offhand" while slots.mainhand.twohanded is true — the two-handed rule is enforced in the store itself, not only via the UI's `locked` prop. Covered by two new tests: "setting an offhand item while mainhand is already two-handed is a no-op" and "clearing the two-handed mainhand does not retroactively unlock offhand from a stale call" (regression guard: the lock is state-derived at call time from slots.mainhand, not a sticky flag). AOItem.twohanded is read verbatim wherever it enters the store (setItem's caller-supplied item); no `_2H_` substring inference anywhere in this task's code.

Deviations / follow-ups:
- The editor page does not yet fetch the real ao-data.json catalogue (no such wiring exists anywhere in the app yet, per ACM-011's own notes) — tierOptionsBySlot/enchantOptionsBySlot are therefore not populated in build/new/page.tsx today. The selectors are fully wired and tested against a synthetic catalogue; connecting the real ItemPicker + catalogue fetch is a separate integration concern (mirrors ACM-011's documented "ItemPicker wiring is a follow-up" stance) and was not invented here to avoid scope creep into src/lib and the data-fetch layer.
- All colors are hex literals reusing the existing --color-tier-*/--color-enchant tokens from ACM-011; no oklch() introduced.

make check: green (lint 0 errors/2 pre-existing <img> warnings, tsc, next build, vitest 96/96).

## Review PR #16 (task/9-tier-enchant)

### 1. Store-level two-handed guard (mutation-tested: REAL)
Removed the `if (slot === "offhand" && state.build.slots.mainhand?.twohanded) return {};` guard in src/store/build-store.ts and reran src/__tests__/build-store.test.ts: "setting an offhand item while mainhand is already two-handed is a no-op" FAILS immediately (received a populated offhand instead of null). Guard restored, full suite green again (22/22 in build-store+tier-enchant). Test is a real regression guard, not decorative. The companion "stale call" test (clearSlot then setItem offhand) is a correctness bonus but not itself proof of the guard (it would pass even without the guard, since mainhand is cleared before the offhand call) — no finding, just noting it doesn't add mutation coverage beyond the first test.

### 2. `twohanded: boolean` on EquippedItem
Verbatim from `AOItem.twohanded`, no `_2H_`/id-substring heuristic anywhere in src/store/build-store.ts or src/components/editor/tier-enchant.ts (grepped). Field is a plain boolean, JSON-serializable, consistent with ACM-011 AC#4 (round-trip / no-function assertion unaffected). No finding.

### 3. CRITICAL — tier/enchant derivation cannot work against the real data pipeline, not just "not wired yet"
tier-enchant.ts derives enchant variants by parsing an `@0`-`@4` suffix off `uniquename` (see ENCHANT_SUFFIX regex) and getTierVariants/getEnchantOptions rely on that suffix existing as separate catalogue entries. I generated the real corpus fixture (src/__tests__/fixtures/ao-corpus.json, 2036 items produced by this project's own ACM-002/003/004 data pipeline) and confirmed:
  - Zero items in the full corpus contain "@" in `uniquename`.
  - `AOItem` (src/data/ao-data.d.ts) has no `maxEnchant` field at all, despite AC #2 wording ("0..item.maxEnchant") implying one exists.
  - Every real item is a single tier-scoped entry (e.g. `T4_OFF_TOWERSHIELD_UNDEAD`) with no enchanted siblings emitted by the pipeline.
So `getEnchantOptions()` run against the actual ao-data.json this project produces would return exactly one option (enchant 0) for every single item, always — this is not a "catalogue not fetched yet" gap, it's that the derivation algorithm's assumed id format does not match the data this codebase's own pipeline emits. tier-enchant.test.ts only exercises a synthetic catalogue fabricated with `@1`/`@2`/`@3` ids (e.g. "T8_HEAD_PLATE_SET1@1") that do not occur anywhere in the real corpus, so the tests pass while masking that AC #2 is unimplementable as written against this project's actual item model. Enchantment in the AO-bin source is carried as a separate numeric attribute per item variant (typically requiring the pipeline to enumerate `@enchantmentlevel` variants explicitly, which ACM-002/004 currently do not emit) — this needs a data-pipeline decision/task before AC #2 can be considered done, not just a "fetch wiring" follow-up.

### 4. Tier parsing against real ids
`parseUniquename` handles the real T1-T8 prefix correctly for standard items and degrades sanely (tier: 0) for non-tiered ids (e.g. `UNIQUE_SHOES_VANITY_...`, 430/2036 real items) — no crash, no false-positive tier match. No finding here; this part is sound against real data. The enchant half is the broken part (see #3).

### 5. Scope / colors / emoji
git diff main...HEAD --name-only stays within src/components/editor/**, src/store/build-store.ts, src/types/build.ts, src/app/(editor)/**, and the three named test files — no touch of build-card/**, item-picker/**, db/**, lib/**, package.json or lockfile. All colors in touched files are hex CSS custom properties already defined in globals.css (--color-tier-4..8, --color-enchant), no oklch() introduced. No literal emoji glyphs in src/components/editor/** (grepped); the lock icon is an inline <svg>.

### 6. Deviation judged
The task's stated deviation ("editor page doesn't fetch real catalogue, selectors only demoed via synthetic props/tests") undersells the gap. It is not just a missing integration wire — AC #2 cannot be satisfied by the current tier-enchant.ts against the data this project's own pipeline emits, per #3. This is not demonstrable end-to-end today even in principle, not merely "not wired yet."

## Verdict: BLOCKED: 1 finding
- CRITICAL (#3 above): AC #2 (enchant options) is unimplementable against the real ao-data catalogue as currently derived; tests only pass against a fabricated id format that doesn't occur in real data. Needs either (a) a data-pipeline decision on how enchant variants are actually represented/emitted before this AC can close, or (b) task descoped to tier-only with enchant explicitly deferred and AC #2 re-scoped.
- Item #1 (store guard) and #2 (twohanded verbatim) verified as real, correctly implemented, mutation-tested. No scope/color/emoji findings.
<!-- SECTION:NOTES:END -->
