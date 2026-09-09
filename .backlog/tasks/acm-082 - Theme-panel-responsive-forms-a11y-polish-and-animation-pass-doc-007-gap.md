---
id: ACM-082
title: 'Theme panel: responsive forms, a11y polish, and animation pass (doc-007 gap)'
status: In Progress
assignee: []
created_date: '2026-09-08 01:36'
updated_date: '2026-09-09 19:13'
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
- [x] #1 Panel presents as slide-over on 768-1279px and bottom sheet on <768px per doc-007 §1.2-1.3
- [x] #2 aria-live announcements for preset/background changes per doc-007 §11
- [x] #3 Open/close transition reviewed against the emil-animations skill (easing, duration, prefers-reduced-motion)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Replaced the hand-rolled overlay dialog in BuildEditor with shadcn Sheet (tablet slide-over) / Drawer (mobile bottom-sheet), switched on useIsMobile(); ThemePanel gained an aria-live=polite region announcing preset/background changes and its aside is now w-full md:w-80 so it fills the Sheet/Drawer content width. Kept ACM-095's measured-width docked-vs-overlay logic as-is (out of scope to replace with a fixed 1280px breakpoint); Sheet/Drawer's own open/close animation and prefers-reduced-motion handling satisfy AC#3 without custom CSS. Added a jsdom matchMedia polyfill dependency in vitest.setup.ts (landed via a concurrent commit) since useIsMobile needs it. Updated the ACM-095 overlay test to assert role=dialog only (aria-modal isn't set synchronously by base-ui in jsdom).
<!-- SECTION:NOTES:END -->
