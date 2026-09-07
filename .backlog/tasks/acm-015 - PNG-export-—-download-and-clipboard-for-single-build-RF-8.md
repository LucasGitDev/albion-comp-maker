---
id: ACM-015
title: PNG export — download and clipboard for single build (RF-8)
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
labels: []
milestone: m-4
dependencies:
  - ACM-013
  - ACM-014
ordinal: 15000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Client-side PNG export using html-to-image. pixelRatio: 2. Fonts embedded via fontEmbedCSS. Clipboard copy via navigator.clipboard.write + ClipboardItem.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Download PNG button exports preview node at 2x resolution
- [ ] #2 Copy to clipboard button works in Chrome/Edge
- [ ] #3 Exported image contains correct item and spell icons (no tainted canvas error)
- [ ] #4 Webfonts embedded in PNG output
<!-- AC:END -->
