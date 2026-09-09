---
id: ACM-082
title: 'Theme panel: responsive forms, a11y polish, and animation pass (doc-007 gap)'
status: To Do
assignee: []
created_date: '2026-09-08 01:36'
updated_date: '2026-09-09 03:07'
labels: []
milestone: m-3
dependencies: []
priority: medium
ordinal: 82000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ACM-014 shipped a simplified ThemePanel: a single always-visible rail layout, no slide-over (768-1279px) or bottom-sheet (<768px) forms from doc-007 §1.2/§1.3, no live-region announcements (doc-007 §11), no keyboard-order verification, and no explicit motion/easing pass (emil-animations skill was not run because the panel currently has no open/close transition — it is always mounted when toggled via display, not animated in/out). Also doc-007's per-preset accent-in-theme flow and the 'custom' derived-preset-with-undo affordance (§9.2/§9.3) do not apply to decision-019's leaner BuildCardTheme (no accent field in the theme) and were dropped rather than adapted — revisit whether a lightweight version of 'preset selection resets any manual override' is still wanted now that decision-019 is final.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Panel presents as slide-over on 768-1279px and bottom sheet on <768px per doc-007 §1.2-1.3
- [ ] #2 aria-live announcements for preset/background changes per doc-007 §11
- [ ] #3 Open/close transition reviewed against the emil-animations skill (easing, duration, prefers-reduced-motion)
<!-- AC:END -->
