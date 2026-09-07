# Decision: OG image generation with Satori

## Status
Accepted

## Context
ACM-022 requires public OG images for shared builds/comps, reachable at
`/api/og/build/[slug]` and `/api/og/comp/[slug]` per the task's own AC, generating a
1200x630 PNG showing comp title, author, build names, and role icons — a simplified layout,
not the full ACM-013 preview component.

Constraints:
- Must run without a DOM (Satori does not use a browser layout engine; it implements a subset
  of flexbox over JSX/SVG).
- Must be reachable at a stable public URL for Discord's link-unfurling bot to fetch,
  unauthenticated (AC#2).
- Icons must come from `/api/icon` (ACM-006), which itself proxies `render.albiononline.com`.
  Satori cannot use an `<img src="...">` the way a browser does with automatic CORS-mediated
  loading — Satori requires image data to already be resolved to a `data:` URI or an
  `ArrayBuffer`/base64 string passed as the `src`, because it has no network stack of its own.
- Route handlers vs. file-convention: Next.js's `opengraph-image.tsx` file convention is
  designed for images tied 1:1 to a page segment and auto-injects the `og:image` meta tag.
  ACM-022's AC explicitly specifies routes under `/api/og/...` instead, decoupled from the
  page segment, and AC#4 requires the app to separately set `og:image`/`og:title`/
  `og:description` meta tags on the public pages via `generateMetadata`. This decision follows
  the task's explicit route shape rather than the file-convention, since the task predates and
  overrides the generic prompt suggestion of `opengraph-image.tsx`.

## Decision

Use **`ImageResponse` from `next/og`** (Satori under the hood) inside Route Handlers at
`app/api/og/build/[slug]/route.tsx` and `app/api/og/comp/[slug]/route.tsx`, running on the
**Edge runtime** (`export const runtime = 'edge'`).

- **Data fetch**: each route loads the build/comp by slug (server-side, same data access used
  by ACM-018/ACM-019's read paths) before rendering. Only public builds/comps resolve
  (private → 404), satisfying AC#2.
- **Icons in Satori**: on the server, fetch each required icon's bytes directly from
  `render.albiononline.com` (not through `/api/icon`, to avoid an extra same-origin hop from
  edge-to-edge) using the Edge Runtime's `fetch`, convert the response to a base64 `data:`
  URI, and pass that as the `src` in the Satori JSX tree. Only a small, bounded number of role
  icons per OG image (per AC#1) need to be fetched, so N parallel `fetch`+base64 calls per
  request is acceptable; cache each `ImageResponse` at the route level with
  `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800` so Discord's repeated
  unfurl requests and re-fetches don't repeat the icon fetch+encode work per view.
- **Fonts**: Satori requires font data as `ArrayBuffer` passed explicitly via the `fonts`
  option — the Edge Runtime cannot read from the filesystem. Load the project's chosen webfont
  file(s) via `fetch(new URL('../../../assets/font.ttf', import.meta.url))` (a same-deploy
  static asset fetch, which works in Edge Runtime and avoids bundling fonts as base64 strings
  in source). PT-BR strings must be tested for the font's glyph coverage — if the primary font
  lacks the accented Portuguese glyphs used in build/comp names, fall back to system-safe glyph
  coverage or ship a second subset font used only for OG text with non-ASCII characters.
- **Layout**: build a deliberately simplified JSX tree (title, author, up to N build
  name+role-icon rows) using only Satori-supported CSS (flexbox, no CSS grid, no
  `object-fit: cover` — use explicit `width`/`height` on `img`). Do NOT attempt to reuse
  ACM-013's preview component tree — Satori's layout engine subset cannot render Tailwind's
  arbitrary utility output, and attempting to share the component invites AC#1 layout bugs
  that only show up in production OG images, not in local dev.
- **Page metadata**: `generateMetadata` on `app/[locale]/builds/[slug]/page.tsx` and the
  comp-equivalent page sets `openGraph.images: ['/api/og/build/${slug}']` (absolute URL) plus
  `og:title`/`og:description` from the same public build/comp record, satisfying AC#4.

## Consequences

- Two icon-fetching code paths now exist for icons: browser-side via `/api/icon` (ACM-006,
  ACM-007) for the editor/preview UI, and server-side direct-to-`render.albiononline.com`
  fetch-to-base64 for OG generation. This is intentional — Satori cannot consume a same-origin
  proxied `<img>` URL the way a browser `<img>` tag can. Anyone touching `/api/icon`'s upstream
  contract must also check the OG routes for a matching upstream URL/id-validation
  regex to avoid divergence (reuse the same id-validation regex from ACM-006, do not
  duplicate a laxer one).
- OG image generation adds an Edge Runtime dependency (`next/og`) but no persistent server —
  compatible with v1's "no backend" scope, since Edge routes are still serverless/stateless.
- Caching (`s-maxage`) is required to keep Discord unfurl latency low and avoid re-encoding
  icons on every request; this must be verified manually as part of ACM-022's DoD (AC#3: paste
  link in Discord, confirm preview renders within Discord's unfurl timeout).
