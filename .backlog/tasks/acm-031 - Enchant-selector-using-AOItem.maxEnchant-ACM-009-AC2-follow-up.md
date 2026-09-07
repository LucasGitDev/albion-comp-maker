---
id: ACM-031
title: Enchant selector using AOItem.maxEnchant (ACM-009 AC#2 follow-up)
status: In Progress
assignee: []
created_date: '2026-09-07 17:23'
updated_date: '2026-09-07 19:26'
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
<!-- SECTION:NOTES:END -->
