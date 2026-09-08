---
id: ACM-089
title: 'Editor: auto-selecionar skill E de armas (única opção, sem picker redundante)'
status: In Review
assignee: []
created_date: '2026-09-08 14:49'
updated_date: '2026-09-08 22:19'
labels: []
milestone: m-2
dependencies: []
priority: high
ordinal: 87000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Armas têm apenas uma skill de E. Exibir picker de E é redundante e confunde. Auto-selecionar a única opção ao equipar a arma, sem mostrar seletor.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Slot E de arma é preenchido automaticamente ao selecionar o item|Nenhum picker de E é exibido quando há só uma opção|Picker só aparece se o item tiver múltiplas opções de E
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented E-only auto-selection (not the general any-single-candidate rule):
- computeAutoSelections (spell-groups.ts) derives the E group's sole candidate uniquename when present and not already selected.
- SlotCard runs it in a useEffect keyed on item.itemId/spells/candidates, firing the same onSpellChange(slot, "e", id) callback a manual pick uses, so it round-trips through build state/schema identically. Re-runs on item change; never touches multi-candidate groups.
- SpellPicker hides the E row once it has a single candidate, and shows neither the row nor the "Sem abilities" empty state in that case (the item genuinely has an ability, just auto-picked).

Decision: scoped to E only, not generalized to every single-candidate group. Real weapon Q/W rows always carry multiple options in game data, so E is the one row that is genuinely never a choice. Also, an out-of-scope test (build-new-page.test.tsx) uses a synthetic weapon fixture with single-candidate Q/W to assert both render as picker rows — a general rule would have silently broken that assertion outside this task's file scope. E-only satisfies every AC without touching that file.

PR: https://github.com/LucasGitDev/albion-comp-maker/pull/58
make check: green (591 tests passing)

REVIEW (PR #58, task/89-auto-select-e-spell)

Scope: clean. Only SlotCard.tsx, SpellPicker.tsx, spell-groups.ts, spell-picker-groups.test.ts, spell-picker-component.test.tsx touched. No files outside the allowlist.

Traced useEffect in SlotCard.tsx (L136-144): deps are [slot, item?.itemId, itemSpells, spellCandidatesByGroup, onSpellChange]. spellCandidatesByGroup is memoized upstream (build/new/page.tsx spellCandidatesBySlot useMemo) and onSpellChange resolves to zustand's setSpell action (stable reference) — no infinite-loop risk in the current wiring, and setSpell itself doesn't re-trigger the memo's deps, so no re-render storm. computeAutoSelections only emits an update when selected[e] !== onlyCandidate, so it never re-fires onSpellChange once settled and never touches multi-candidate groups — explicit user picks on Q/W/passive are never clobbered.

Round-trip: confirmed identical shape to manual pick — both call onSpellChange(slot, group, id) through the exact same store action (setSpell), so no schema divergence risk.

AC4 (E-only narrowing) judged: LEGITIMATE, not test-dodging. build-new-page.test.tsx's T4_MAIN_SWORD fixture deliberately has a single Q candidate and a single W candidate and asserts both still render as picker rows — a real, load-bearing assertion, not an incidental synthetic quirk. The AC text only ever asks for E behavior; scoping AUTO_SELECT_GROUPS to ["e"] satisfies every stated AC without inventing an unrequested general single-candidate rule that would have silently changed unrelated Q/W behavior. No bug is being masked here.

FINDINGS (non-blocking, recorded as debt):

MEDIUM — State-desync window (SpellPicker.tsx L40 vs SlotCard.tsx effect). SpellPicker hides the E row purely on structural candidate count (count === 1), independent of whether the store's `selected.e` has actually been written yet by the effect. On the render immediately after equipping the item, E is genuinely unset (null) AND hidden, for one render/effect cycle. Not reachable via normal manual UI (the effect commits well before a human's next interaction), but it's an architectural smell: deriving the auto-selection reactively via an effect instead of at selection time (e.g. inside a store `setItem`/`equipItem` action) means there's always a transient "hidden + unset" frame. Recommend moving the auto-fill into the item-selection action itself in a follow-up, so the write and the render are atomic.

MEDIUM — Test gap on the AC-critical integration path. All new tests exercise either the pure `computeAutoSelections` function (spell-picker-groups.test.ts) or SpellPicker's row-hiding in isolation with pre-seeded `selected` state (spell-picker-component.test.tsx). None mount the real `SlotCard` and assert `onSpellChange` actually fires when an item with a single-candidate E is equipped — i.e. AC #1 ("Slot E de arma é preenchido automaticamente ao selecionar o item") is unverified by any test that touches the real effect + dependency array. I traced the wiring manually and it is currently correct, but a future refactor that breaks the dependency array would not be caught by this suite. Recommend adding one SlotCard-level test before closing.

LOW — Dead branch: `onSpellChange(slot, group, updates[group] ?? null)` in the effect — `computeAutoSelections` never returns a group with an undefined value for a key it includes, so `?? null` is unreachable. Harmless, slightly misleading.

VERDICT: LGTM (no CRITICAL/HIGH). Two MEDIUM debt items recorded above — not blocking, recommend follow-up task for the SlotCard-level test and the store-level derivation.
<!-- SECTION:NOTES:END -->
