---
id: ACM-022
title: Open Graph image generation via Satori (RF-9)
status: To Do
assignee: []
created_date: '2026-09-07 13:34'
updated_date: '2026-09-07 17:05'
labels: []
milestone: m-7
dependencies:
  - ACM-018
  - ACM-019
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
/api/og/comp/[slug] and /api/og/build/[slug] generate 1200x630 PNG using Satori. Simplified layout (not full preview component — Satori is not the browser).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 OG image shows comp title, author, build names and role icons
- [ ] #2 Image reachable without auth for public builds/comps
- [ ] #3 Link pasted in Discord shows OG preview
- [ ] #4 meta og:image, og:title, og:description set on public pages
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. [Research] Read decision-008; confirm ACM-018/ACM-019 read APIs for public build/comp lookup by slug exist and can be called from an Edge Runtime route (no Node-only DB driver).
2. [Scaffold] Create app/api/og/build/[slug]/route.tsx and app/api/og/comp/[slug]/route.tsx, both `export const runtime = 'edge'`, each importing ImageResponse from next/og.
3. [Implement] Data loading: fetch public build/comp by slug; return 404 Response (not an ImageResponse) if not found or not public, satisfying AC#2.
4. [Implement] Icon resolution helper: server-side fetch of render.albiononline.com/v1/{item|spell}/{id}.png per required role icon, base64-encode into a data: URI, reusing ACM-006's id-validation regex; run fetches in parallel with Promise.all, bounded to the small icon count actually needed for the layout.
5. [Implement] Font loading: fetch webfont file(s) as ArrayBuffer via fetch(new URL(...)), pass through Satori's `fonts` option; verify glyph coverage for PT-BR accented characters used in build/comp names.
6. [Implement] Build simplified Satori-compatible JSX layout (flexbox only, explicit img width/height, no CSS grid) rendering comp/build title, author, build name + role icon rows, at 1200x630.
7. [Implement] Set Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800 on the ImageResponse.
8. [Implement] generateMetadata on app/[locale]/builds/[slug]/page.tsx and app/[locale]/comps/[slug]/page.tsx setting openGraph.images to the absolute /api/og/... URL plus og:title/og:description from the public record, satisfying AC#4.
9. [Test] Route handler test rendering a fixture build/comp and asserting a 200 PNG response with expected Content-Type and Cache-Control headers; assert 404 for private/nonexistent slugs.
10. [Verify] Manual test steps: (a) fetch /api/og/build/[known-public-slug] directly and confirm it renders a correct 1200x630 PNG, (b) paste the public build/comp URL into a Discord channel and confirm the unfurled preview shows the OG image, title, and description within Discord's normal unfurl time.
11. [Verify] make check exits 0.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
ATENCAO: decision-008 (OG/Satori) foi criada vazia e marcada 'accepted' por engano, e removida. NAO existe decisao registrada sobre Satori — spawn architect antes de implementar.

SECURITY (from ACM-016 audit): OG image generation renders stored user content. Do not interpolate raw stored JSON/content into the Satori/SSR output without validation — stored XSS surface. Also respect the visibility flag added in ACM-021: no OG image for private builds.
<!-- SECTION:NOTES:END -->
