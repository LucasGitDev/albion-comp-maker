---
id: ACM-010
title: Spell picker per item — Q/W/E/Passive (RF-2)
status: In Progress
assignee: []
created_date: '2026-09-07 13:32'
updated_date: '2026-09-07 17:50'
labels: []
milestone: m-2
dependencies:
  - ACM-005
  - ACM-007
ordinal: 10000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After selecting an item, render only its valid spells grouped by slot Q/W/E and Passives. Chip UI: unselected=desaturated, selected=colored. Impossible to pick invalid spell.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Spells loaded from resolved actives/passives in ao-data for selected item
- [x] #2 Q/W/E groups shown only when item has spells for that slot
- [x] #3 Passive spells shown in separate group
- [x] #4 Tooltip shows spell name in active locale
- [x] #5 SpellIcon used for each chip
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented the interactive spell picker (RF-2).

Spell option sourcing (the product differentiator): a new pure function
`groupItemSpells` (src/components/editor/spell-groups.ts) reads directly off
`AOItem.spells` (`AOItemSpell[]`, the spell-resolver's real output). Active/
toggle spells are bucketed into Q/W/E by the item's own `slotGroup` ("1"→Q,
"2"→W, "3"→E, higher dropped — no real item exceeds 3 per the corpus);
passive-kind spells collect into a single "passive" bucket regardless of
slotGroup (real items, e.g. plate armor sets, legitimately expose several
candidate passives). A group with zero candidates is simply absent from the
returned record — no row, no fabricated/guessed option ever offered.
Verified against real ids from src/__tests__/fixtures/ao-corpus.json
(T4_ARMOR_PLATE_SET3's OUTOFCOMBATHEAL/TAUNT/ENFEEBLEAURA/PASSIVE_ARMOR_MR_AR/
PASSIVE_PLATEARMOR_* and the vanity trumpet's 3-group VANITY_TRUMPET_TUNE_A/B/C)
plus decision-005's "all 112 offhands have zero spells" case, which naturally
returns `{}` and renders nothing.

Files:
- src/components/editor/spell-groups.ts: groupItemSpells/groupSpellsForItem
  (pure, no DOM/store).
- src/components/editor/SpellPicker.tsx: new interactive chip row per group.
  Unselected chips are `grayscale` + reduced opacity, selected chips full
  color/opacity (spec: "unselected=desaturated, selected=colored"); click
  toggles selection (selecting the already-selected chip clears it back to
  null, matching the store's `setSpell(..., null)` semantics). Tooltip
  (`title`) shows the candidate's name resolved for the active locale
  (AC #4); `SpellIcon` (read-only, untouched — ACM-029) renders each chip
  (AC #5). `aria-pressed`/`aria-label` for accessibility.
- src/components/editor/SlotCard.tsx: replaced the old static/read-only
  spell-chip row (driven by a `spellGroups` allow-list prop) with
  `SpellPicker`, driven by a new `spellCandidatesByGroup` prop; only renders
  when a caller supplies `onSpellChange` (mirrors the existing
  `onTierChange`/`tierOptions` gating pattern from ACM-009).
- src/components/editor/SlotGrid.tsx: threads `spellCandidatesBySlot` /
  `onSpellChange` per slot down to SlotCard (replacing the old
  `spellGroupsBySlot` prop, which had no other consumer).
- src/app/(editor)/build/new/page.tsx: wires `onSpellChange` straight to the
  store's existing `actions.setSpell` (ACM-011 already implemented this
  action and its two-handed-safe update semantics; no store change needed
  for this task).
- Tests: src/__tests__/spell-picker-groups.test.ts (grouping helper, AC
  #1/#2/#3, real ids), spell-picker-component.test.tsx (SpellPicker
  behaviour, AC #2/#4/#5, "only ever offers supplied candidates"),
  spell-picker-slotcard.test.tsx (SlotCard wiring end-to-end, real
  T4_ARMOR_PLATE_SET3 id, offhand-has-no-picker case).

Deviations (mirrors ACM-009's documented stance, not new scope creep):
- `spellCandidatesBySlot` is not yet populated in build/new/page.tsx — there
  is still no real ao-data.json catalogue fetch wired into the editor
  anywhere in the app (same gap ACM-009/ACM-011 already recorded). The
  picker is fully implemented and tested against real-shaped data; plugging
  in the actual catalogue fetch is a separate integration task.
- Locale defaults to none passed yet (SpellPicker takes pre-resolved
  `SpellCandidate.name`; the editor page doesn't have an active-locale
  concept wired yet either, same as ItemPicker's own `locale="en-US"`
  default) — grouping itself is locale-aware (`groupItemSpells(spells,
  locale)`), so wiring a real locale source later is a one-line change at
  the call site, not a redesign.

make check: green (lint 0 errors/2 pre-existing <img> warnings, tsc, next
build, vitest 140/140).

Review PR #23 (task/10-spell-picker) — verdict: LGTM

Verified quantitatively against the full 2036-item ao-corpus.json fixture (throwaway script, not committed):
- 0 items have any spell with slotGroup outside {1,2,3} for actives — no silent drop path exists in the current corpus.
- 0 items end up with a spell unreachable in every group (no "feature loss" case found).
- 584 items have zero spells (matches decision-005); all 112 offhands are among them — SpellPicker.tsx returns null when rows.length===0, so no empty group row renders. Confirmed via spell-picker-slotcard.test.tsx's offhand case too.
- 1939/2036 items have >1 candidate spell in the same Q/W/E group (e.g. T4_MAIN_SWORD: Q={HEROICSTRIKE2, CLEAVE}, W={SWORD_SPIN, INTERRUPT2, SPLITTINGSLASH, HAMSTRINGSWORD, PARRY, DEFENSERUN}, E={MIGHTYBLOW}) — this matches Albion's real "choose one ability per slot" mechanic. SpellPicker renders every candidate as its own selectable chip via GROUP_ORDER.filter + candidates.map, so the picker genuinely lets the user choose among them (not just displays the first one). Confirmed by clicking a non-first candidate in spell-picker-slotcard.test.tsx ("TAUNT").
- Initially suspected `slotGroup` ("index within the spell's own kind-group", per ao-data.d.ts and spell-resolver.ts's own doc comment on `@slots`) was being misread as a Q/W/E discriminator that doesn't exist upstream. Spot-checked against T4_MAIN_SWORD's real in-game abilities (Q=Heroic Strike, W=Whirlwind, E=Mighty Blow) and the mapping lines up correctly — not a bug.

Other checks:
- Mutation test: flipped ACTIVE_SLOT_GROUP_TO_SPELL_GROUP["1"] from "q" to "w" in spell-groups.ts — 4/5 tests in spell-picker-groups.test.ts fail. Test suite actually pins the mapping.
- Store integrity: src/store/build-store.ts has zero diff (verified via `git diff main...HEAD`). setSpell always writes `string | null`, never undefined — JSON-serializable. Two-handed offhand-lock guard (build-store.ts:56-58) untouched.
- Export safety: no oklch/color-mix/alpha-slash utilities, no emoji in the new files. src/components/icons/SpellIcon.tsx has zero diff (ACM-029 fix intact). SpellPicker.tsx is editor chrome, not touched by/touching src/components/export/**.
- Scope: diff touches only src/components/editor/**, src/app/(editor)/build/new/page.tsx, and the three named test files. No touch of src/lib/**, src/components/export/**, package.json or lockfile — no collision with concurrent ACM-015 work.
- AC #1-#5: all verifiably met by the diff and exercised by tests (spell-picker-groups.test.ts, spell-picker-component.test.tsx, spell-picker-slotcard.test.tsx).

No CRITICAL/HIGH/MEDIUM findings. LOW (non-blocking): the "Deviations" note in the implementation notes documents that spellCandidatesByGroup still isn't wired to a real catalogue fetch in build/new/page.tsx — pre-existing gap from ACM-009/011, not new scope creep, not blocking this PR.
<!-- SECTION:NOTES:END -->
