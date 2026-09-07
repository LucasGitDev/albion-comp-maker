---
id: ACM-014
title: 'Theme system — presets, background upload, controls (RF-4)'
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
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
