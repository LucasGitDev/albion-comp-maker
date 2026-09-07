---
id: ACM-009
title: Tier and enchant selectors after item pick (RF-1)
status: In Progress
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 17:14'
labels: []
milestone: m-2
dependencies:
  - ACM-005
  - ACM-007
  - ACM-030
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After choosing an item, show tier select (T4-T8 variants of same base) and enchant select (0..maxEnchant). Updates icon preview.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tier variants derived from ao-data items sharing same base ID
- [ ] #2 Enchant select only shows 0..item.maxEnchant options
- [ ] #3 Icon updates on tier/enchant change
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
decision-011: AC#2 (enchant selector) is unimplementable against real data — real uniquenames never carry an @N enchant suffix; enchant is a nested enchantments.enchantment array on the base upstream item, and AOItem has no maxEnchant field yet. ACM-030 created to add AOItem.maxEnchant from the pipeline; ACM-009 now depends on it.

Recommendation for PR #16: descope to tier-only now. AC#1 (tier variants) and AC#3 (icon updates) do not depend on maxEnchant and are reviewable/mergeable independently. Rewrite tier-enchant.ts's getEnchantOptions() to consume item.maxEnchant once ACM-030 lands, replacing the uniquename @N parsing and its fabricated-fixture test (T8_HEAD_PLATE_SET1@1) with a real fixture item (e.g. T4_HEAD_PLATE_SET1, maxEnchant 4). Do not hold PR #16 open waiting for ACM-030 — split AC#2 into a follow-up PR against this same task once the dependency merges.
<!-- SECTION:NOTES:END -->
