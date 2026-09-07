---
id: ACM-030
title: Emit maxEnchant on AOItem
status: In Review
assignee: []
created_date: '2026-09-07 17:13'
updated_date: '2026-09-07 17:22'
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

Review (PR #19, branch task/30-max-enchant): LGTM, no blocking findings.

Verification performed:
1. computeMaxEnchant() correctness: confirmed all three shapes handled (absent -> 0, array -> length, single-child collapsed object -> 1). Mutation test performed manually: changed the object-branch fallback from `1` to `0` and reran scripts/sync-ao-data.test.ts -> the "normalizes a single-child enchantment object" test failed as expected, confirming the test genuinely guards this branch (not a vacuous assertion). Restored the file after.
2. Distribution sanity check against regenerated src/data/ao-data.json (independent of task notes): counted maxEnchant across all 2036 items -> {0: 636, 3: 5, 4: 1395}, exact match to notes. Spot-checked the 5 items at maxEnchant=3 (all T4-T8 IRONGAUNTLETS_HELL, an artifact-tier weapon) against the raw upstream .cache/items-raw.json: enchantments.enchantment is a genuine 3-entry array (levels 1,2,3, contiguous, real craftingrequirements/upgraderequirements per level) - not a parsing artifact. Checked the 636 zeros are not a whole-category parse miss: every equippable slot (head/armor/shoes/cape/offhand/bag/mainhand) has both zero and nonzero maxEnchant items; only `mount` is 100% zero, correct per decision-011 (mounts aren't enchantable) and general Albion domain knowledge (T1-T3 gear is also correctly all zero).
3. Breaking type change: collateral edits to scripts/build-test-fixture.ts and the three item-picker/item-index test factories are minimal, additive (`maxEnchant: 0` default / passthrough), and don't weaken any existing assertion. Ran `grep -rn maxEnchant` equivalent check via the diff itself - no other AOItem construction site was missed; tsc --noEmit passes clean, confirming no silent type error elsewhere.
4. Fixture regeneration: confirmed src/__tests__/fixtures/ao-corpus.json still has exactly 2036 items and 699 referenced spells (matches notes). maxEnchant survived regeneration (1400 items > 0 in the fixture, consistent with the ao-data.json distribution). Note (non-blocking, pre-existing, not introduced by this PR): `twohanded` was never part of PrunedItem in build-test-fixture.ts on main either - it isn't and never was pruned into the fixture, so "twohanded survived regeneration" doesn't apply here; this is a pre-existing gap unrelated to this diff, not a regression it caused.
5. vitest.config.ts + import.meta.url guard: confirmed the guard matches the actual invocation (`tsx scripts/sync-ao-data.ts` via the `sync:ao` script), which sets process.argv[1] to the script path, so production behavior is unchanged; the guard only prevents `main()` from firing on `import` (used by the new tests).
6. Scope: no changes outside scripts/, src/data/ao-data.d.ts, src/__tests__/**, vitest.config.ts, and the task file. No package.json/lockfile/editor/icons/store/db/auth touches.
7. Independently reran `tsc --noEmit` (clean) and the full vitest suite (110/110 passing) on the worktree to corroborate the implementer's make-check claim.

Verdict: LGTM.
<!-- SECTION:NOTES:END -->
