---
id: ACM-015
title: PNG export — download and clipboard for single build (RF-8)
status: Done
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 18:45'
labels: []
milestone: m-4
dependencies:
  - ACM-029
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. [Research] Confirm html-to-image API surface (toPng, toBlob, getFontEmbedCSS) matches decision-007; add html-to-image to package.json dependencies (flag for devex-guard: package.json touch).
2. [Scaffold] Add export utilities module (e.g. src/lib/export-png.ts) exposing exportNodeToPng(node, opts) and exportNodeToClipboard(node) wrapping html-to-image calls with pixelRatio:2 and fontEmbedCSS.
3. [Implement] Wire Download button in ACM-013's preview toolbar to call exportNodeToPng on the preview root ref, trigger a file download (anchor + toDataURL/blob URL), filename derived from build name/slug.
4. [Implement] Wire Copy to clipboard button to exportNodeToClipboard using toBlob + navigator.clipboard.write([new ClipboardItem({'image/png': blob})]); feature-detect ClipboardItem/clipboard.write and disable/hide button with a tooltip if unsupported (non-Chrome/Edge).
5. [Implement] Ensure all icon <img> tags rendered inside the preview node use /api/icon (same-origin) exclusively — verify no direct render.albiononline.com src slips in from ACM-007's ItemIcon/SpellIcon components.
6. [Test] Component/integration test asserting exportNodeToPng resolves to a non-empty PNG blob for a sample BuildState fixture; mock html-to-image in unit tests if jsdom canvas support is insufficient.
7. [Verify] Manual test steps (per Definition of Done): (a) Download button produces a PNG matching on-screen preview pixel-for-pixel at 2x, (b) Copy button pastes a correct image into Discord/an image editor in Chrome, (c) exported PNG shows correct fonts without FOUT/fallback glyphs.
8. [Verify] make check exits 0.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
GUARD LIMIT (from ACM-029 review, MEDIUM): the export-safety guard inspects RENDERED MARKUP TEXT only. It catches alpha-slash utilities, bracket-alpha syntax, and literal oklab(/oklch(/color-mix( in className/innerHTML/inline styles. It does NOT resolve CSS custom properties: style={{backgroundColor:'var(--x)'}} with '--x: oklab(...)' in globals.css passes all assertions. Safe today (all globals.css tokens are hex) but if you introduce var()-based colors in the capture root, the guard will NOT protect you.

UNRESOLVED (ACM-029 AC#4, honestly not verified): whether html-to-image resolves color-mix(). Tailwind v4 emits a plain-hex fallback plus an @supports(color:color-mix())-gated override, so the open question is whether html-to-image's DOM-to-SVG serialization reads the gated computed value. No browser tooling was available to test. VERIFY THIS EMPIRICALLY as the first step of this task, once html-to-image is actually installed — export a card containing a spell badge and inspect the PNG.
<!-- SECTION:NOTES:END -->
