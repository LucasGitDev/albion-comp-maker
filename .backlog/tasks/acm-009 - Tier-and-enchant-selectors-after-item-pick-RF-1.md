---
id: ACM-009
title: Tier and enchant selectors after item pick (RF-1)
status: In Review
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 17:08'
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
<!-- SECTION:NOTES:END -->
