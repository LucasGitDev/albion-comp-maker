---
id: ACM-030
title: Emit maxEnchant on AOItem
status: In Review
assignee: []
created_date: '2026-09-07 17:13'
updated_date: '2026-09-07 17:20'
labels: []
dependencies:
  - ACM-024
  - ACM-026
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
decision-011 specified carrying the upstream enchantments.enchantment count into the emitted item as maxEnchant, but scripts/sync-ao-data.ts never implemented it and AOItem in src/data/ao-data.d.ts lacks the field. Caught by ACM-009 PR #16 review: the enchant selector (RF-1 AC#2) cannot be implemented against real data without it, since real uniquenames never carry an @N enchant suffix (that heuristic does not exist upstream). See decision-011 for the verified upstream schema (items.json equipmentitem/weapon/mount/transformationweapon: nested enchantments.enchantment array, 0/3/4 levels observed, no spell variance by enchant level).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AOItem type in src/data/ao-data.d.ts has a maxEnchant: number field
- [x] #2 sync-ao-data.ts computes maxEnchant as the count of enchantments.enchantment entries on the raw item record (0 when the enchantments key is absent)
- [x] #3 T4_HEAD_PLATE_SET1 emits maxEnchant 4 and a mount item emits maxEnchant 0, asserted by a unit test
- [x] #4 src/__tests__/fixtures/ao-corpus.json regenerated so at least one fixture item has maxEnchant > 0
- [x] #5 make check exits 0
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. In scripts/sync-ao-data.ts, in the per-item emit loop (around line 233), read the raw item's `enchantments.enchantment` node (array or single object, same normalization already used elsewhere for singular-vs-array upstream XML->JSON quirks); compute `maxEnchant` as its length, or 0 if the `enchantments` key is absent.
2. Add `maxEnchant: number` to the `AOItem` type in src/data/ao-data.d.ts.
3. Include `maxEnchant` in the pushed item object at line 233.
4. Add/extend a unit test (co-located with existing sync-ao-data / spell-resolver tests) asserting T4_HEAD_PLATE_SET1 -> maxEnchant 4 and a mount uniquename -> maxEnchant 0, using a small inline fixture of the raw upstream shape (mirrors how twohanded was tested in ACM-026) — do not hit the network in tests.
5. Regenerate src/__tests__/fixtures/ao-corpus.json via the real pipeline run so real fixture items carry maxEnchant (needed by ACM-009 AC#2 tests downstream).
6. Run make check; fix lint/type errors.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
touches (for orchestrator parallelism check): scripts/sync-ao-data.ts, src/data/ao-data.d.ts, src/__tests__/fixtures/ao-corpus.json, scripts/**/*.test.ts. Must serialize with any other task touching scripts/sync-ao-data.ts or the fixture corpus (per CLAUDE.md: data pipeline output schemas are a shared-file serialization boundary).

Implemented computeMaxEnchant() in scripts/sync-ao-data.ts, reading enchantments.enchantment off the raw item record and normalizing the single-child-object vs array XML->JSON collapse (both shapes covered by unit tests in scripts/sync-ao-data.test.ts). Added maxEnchant: number to AOItem (src/data/ao-data.d.ts).

Guarded main() behind an import.meta.url check so sync-ao-data.ts can be imported by tests without triggering the network-fetching pipeline; added scripts/**/*.test.ts to vitest.config.ts include glob (no prior scripts/ tests existed).

Ran the real pipeline against live upstream data. Observed maxEnchant distribution across the 2036 emitted items: 0 -> 636 items, 3 -> 5 items, 4 -> 1395 items. Matches decision-011's cited distribution shape (0/3/4, never a fixed constant). Verified T4_HEAD_PLATE_SET1 -> maxEnchant 4 and a mount (T2_MOUNT_MULE) -> maxEnchant 0 directly against the regenerated ao-data.json, per AC#3.

Regenerated src/__tests__/fixtures/ao-corpus.json (still 2036 items, 699 referenced spells) via scripts/build-test-fixture.ts, extended to carry maxEnchant through the pruned item shape so ACM-009's enchant selector can consume real values.

Collateral fix (outside the listed touches but required to keep make check green): the local item() test factories in src/__tests__/item-index.test.ts, item-picker.test.tsx and item-picker-polish.test.tsx built AOItem objects and needed a maxEnchant: 0 default added now that the field is required on the type — same pattern as any prior AOItem field addition (e.g. twohanded).

make check exits 0 (lint, tsc --noEmit, next build, vitest — 15 files / 103 tests passed).
<!-- SECTION:NOTES:END -->
