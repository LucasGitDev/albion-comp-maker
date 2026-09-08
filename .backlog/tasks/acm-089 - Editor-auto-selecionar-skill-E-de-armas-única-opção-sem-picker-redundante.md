---
id: ACM-089
title: 'Editor: auto-selecionar skill E de armas (única opção, sem picker redundante)'
status: In Review
assignee: []
created_date: '2026-09-08 14:49'
updated_date: '2026-09-08 22:16'
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
<!-- SECTION:NOTES:END -->
