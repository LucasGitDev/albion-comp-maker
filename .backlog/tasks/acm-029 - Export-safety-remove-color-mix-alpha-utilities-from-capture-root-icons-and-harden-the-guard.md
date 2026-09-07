---
id: ACM-029
title: >-
  Export safety: remove color-mix/alpha utilities from capture-root icons and
  harden the guard
status: In Progress
assignee: []
created_date: '2026-09-07 17:11'
updated_date: '2026-09-07 17:18'
labels: []
milestone: m-2
dependencies:
  - ACM-013
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SpellIcon uses Tailwind alpha utility bg-black/70, which Tailwind v4 compiles to color-mix(in oklab, var(--color-black) 70%, transparent). This node renders inside the PNG capture root via SpellRow in every BuildCard variant. decision-007 names oklch/color-mix as the exact risk class that motivated choosing html-to-image, but nothing in the repo proves html-to-image resolves color-mix(). If it does not, every exported PNG silently loses the badge background behind the Q/W/E/P spell letters. The ACM-013 guard test does not catch this: its regex only matches bg-<palette>-<shade> classNames and it only greps for the literal 'oklch(' substring.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 SpellIcon Q/W/E/P badge background uses a literal hex/rgba value, not a Tailwind alpha utility or color-mix()
- [ ] #2 Export-safety guard test also rejects color-mix( and oklab/oklch anywhere in the BuildCard capture-root subtree, and is mutation-tested (introducing color-mix into the subtree must fail the test)
- [ ] #3 A repo-wide check confirms no remaining alpha-slash Tailwind utility (bg-*/NN, text-*/NN, border-*/NN) renders inside the capture root
- [ ] #4 Empirically verify and record in task notes whether html-to-image resolves color-mix(); record the finding as a backlog decision if it changes decision-007
- [ ] #5 make check green
<!-- AC:END -->
