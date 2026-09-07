---
id: ACM-014
title: 'Theme system — presets, background upload, controls (RF-4)'
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 17:40'
labels: []
milestone: m-3
dependencies:
  - ACM-008
  - ACM-011
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Theme panel: preset selector (dark-purple/gold/blood/ice/custom), background image upload with blur/darken/scale controls, accent color, font, show/hide item and spell names, aspect ratio.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Background upload: 4 MB max, JPEG/PNG/WebP, server-resized to max 2000px via sharp, stored as WebP
- [ ] #2 theme_json stores path not dataURL
- [ ] #3 Blur, darken, scale sliders update preview in real time
- [ ] #4 Aspect ratio: square/wide/auto changes preview wrapper dimensions
- [ ] #5 4 built-in presets apply token sets
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
GUARD LIMIT (from ACM-029 review, MEDIUM): the export-safety guard does NOT resolve CSS custom properties — a var() pointing at an oklab/oklch value in globals.css passes the guard undetected. This task introduces theme presets and colors into the capture root, so it is the most likely task to break PNG export silently. Use hex literals; if you use var() tokens, extend the guard to resolve them.
<!-- SECTION:NOTES:END -->
