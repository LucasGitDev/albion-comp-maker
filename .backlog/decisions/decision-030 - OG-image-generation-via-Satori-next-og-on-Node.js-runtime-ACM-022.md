---
id: decision-030
title: OG image generation via Satori/next-og on Node.js runtime (ACM-022)
date: '2026-09-10 01:38'
status: accepted
---
## Context

ACM-022 (RF-9) requires `/api/og/build/[slug]` and `/api/og/comp/[slug]`
route handlers that generate a 1200x630 PNG (title, author, build
names/role icons) for Discord link-unfurl previews, plus `generateMetadata`
on the two public pages setting `og:image`/`og:title`/`og:description`.

An earlier decision on this same topic (decision-008) picked the Edge
runtime for these routes. That decision is superseded here: both routes'
data comes from `getPublicBuildBySlug`/`getPublicCompBySlug`
(`src/lib/public-content.ts`), which call `getDb()` — `better-sqlite3`, a
native Node addon. Native addons cannot load on Next's Edge runtime at
all, so an Edge-runtime OG route can never call these functions directly.
Re-implementing the read path against a different (e.g. HTTP/edge-safe)
data layer just for these two routes was rejected: it would duplicate
ACM-021's no-existence-oracle contract (private/nonexistent/invalid-content
all collapse to the same `null`) in a second place, which is exactly the
kind of divergence that contract is designed to prevent.

## Decision

Run both OG routes on the **Node.js runtime** (the App Router default —
no `export const runtime = 'edge'`), calling `getPublicBuildBySlug` /
`getPublicCompBySlug` as-is. `dynamic = 'force-dynamic'` (no ISR caching
of the route's own render — freshness is handled by response
`Cache-Control` instead, see below).

- **404 contract**: a `null` result returns `new NextResponse(null, {
  status: 404 })`, never an `ImageResponse` — preserves ACM-021's
  no-existence-oracle property for this endpoint too (AC#2).
- **Icons**: `src/lib/og-icons.ts` fetches
  `render.albiononline.com/v1/{item|spell}/{id}.png` server-side (reusing
  the `ID_PATTERN` allow-list from `src/app/api/icon/route.ts`) and
  base64-encodes to a `data:` URI, because Satori has no network stack of
  its own and cannot resolve a same-origin proxied `<img src="/api/icon?...">`
  the way a browser can. Any single icon fetch failure falls back to a
  transparent 1x1 PNG `data:` URI rather than failing the whole image.
  Icon count per request is bounded to the icons actually rendered (one
  per build row).
- **Font**: Noto Sans (SIL OFL 1.1, license-clear, full PT-BR accented
  glyph coverage) shipped as a static asset at
  `src/assets/fonts/NotoSans-Regular.ttf`, read via `fs.readFile` at
  request time (`src/lib/og-font.ts`) — available because this runs on
  Node, unlike the `fetch(new URL(...))`-from-Edge pattern typical
  `next/og` examples use.
  - This differs from decision-008 (which described that Edge `fetch`
    approach); Node's `fs.readFile` is the substitute.
- **Layout**: Satori-supported CSS only (flexbox, explicit `width`/
  `height` on every `<img>`, no CSS grid). Plain JSX children for all
  text — build/comp names and author names are user-controlled free text
  (ACM-057-bounded); never interpolated into `dangerouslySetInnerHTML` or
  built as a string template, per the ACM-016 audit finding on this same
  surface.
- **Caching**: `Cache-Control: public, s-maxage=86400,
  stale-while-revalidate=604800` on success only; 404 responses are
  uncached.
- **Rate limiting**: `/api/og/build/:slug` and `/api/og/comp/:slug` are
  added to `src/proxy.ts`'s existing public-read matcher/regex, sharing
  the same per-IP/untrusted budget as `/build/:slug` and `/comp/:slug`
  (decision-016/029) — same anonymous-read shape, same abuse surface.
- **Metadata**: `generateMetadata` on `src/app/build/[id]/page.tsx` and
  `src/app/comp/[slug]/page.tsx` re-derives the public record (no extra
  fetch machinery) and sets `openGraph.images` to an absolute URL built
  from the request's `Host`/`X-Forwarded-*` headers
  (`src/lib/request-origin.ts`) — only on the success path; a `null`
  record returns `{}` and the page itself calls `notFound()`.
- **Author attribution**: `getPublicBuildBySlug`/`getPublicCompBySlug`
  now also select `users.name` (via an inner join on `userId`) as
  `authorName`, since AC#1 requires showing the author and neither
  function previously exposed it. `authorName` is nullable (Auth.js does
  not guarantee every provider sets `users.name`) — callers render an
  "Unknown" fallback, never assume non-null.

## Consequences

- Two icon-fetching code paths now exist: browser-side via `/api/icon`
  (ACM-006/007) for the editor/preview UI, and server-side
  direct-to-`render.albiononline.com` fetch-to-base64 for OG generation
  (`og-icons.ts`). Anyone changing `/api/icon`'s upstream contract
  (allow-list regex, base URL) must check `og-icons.ts` for the same
  change to avoid divergence.
- `public-content.ts`'s public surface grew by one field
  (`authorName`) on both `PublicBuild` and `PublicComp`/
  `PublicCompBuildEntry.build` — an additive, non-breaking change to an
  existing module rather than a new parallel read path.
- decision-008 is superseded by this decision for runtime choice (Node,
  not Edge) and font loading (`fs.readFile`, not `fetch`-from-Edge); its
  reasoning on route-handler-vs-file-convention and Satori CSS
  constraints still holds and is not repeated here.

