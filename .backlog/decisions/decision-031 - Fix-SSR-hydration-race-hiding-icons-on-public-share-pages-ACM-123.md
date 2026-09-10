---
id: decision-031
title: Fix SSR hydration race hiding icons on public share pages (ACM-123)
date: '2026-09-10 13:12'
status: accepted
---
## Context

Item/spell icons rendered as grey blocks on the public `/build/[id]` and
`/comp/[slug]` share pages, but loaded fine in the editor. All icon
requests already go through the same-origin `/api/icon` proxy (relative
URL), so `next.config`'s `images.remotePatterns` allowlist and CORS/CSP
headers were not the cause — nothing in the app renders a remote CDN URL
directly in the browser, and no CSP is configured anywhere in the app.

`ItemIcon`/`SpellIcon` (`src/components/icons/`) are `"use client"`
components whose visibility (`opacity-0` → `opacity-100`) is driven by
`useIconStatus`, a state hook that flips to `"loaded"` only inside the
`<img>`'s `onLoad`/`onError` React event handlers.

The share pages (`src/app/build/[id]/page.tsx`, `src/app/comp/[slug]/page.tsx`)
are server-rendered: the `<img src="/api/icon?...">` tag is already present,
with its final `src`, in the initial HTML. The browser starts fetching that
image while parsing the HTML — before React hydrates the page and attaches
the `onLoad`/`onError` listeners. For a fast, same-origin proxied response
(the common case), the image finishes loading before hydration completes,
so the native `load` event fires with no React listener attached to catch
it. `status` never reaches `"loaded"`, the `<img>` stays permanently
`opacity-0`, and only the grey `bg-icon-placeholder` layer underneath is
visible — this is the "grey block" from the bug report. The editor never
hits this because its icons are attached to already-hydrated DOM (typed
into slots client-side), so `onLoad` is always wired up before the browser
starts the request.

## Decision

Add a callback `ref` (`refCallback`, `src/components/icons/use-icon-status.ts`)
on the `<img>` that runs at mount/commit time and synchronously checks
`HTMLImageElement.complete`/`naturalWidth`. If the image already finished
loading (or failed) by the time the ref attaches — the exact SSR race
above — the hook resolves `status` immediately from that snapshot instead
of waiting for an `onLoad`/`onError` event that already fired unobserved.
Images still in flight at mount (`complete === false`) are unaffected and
resolve normally through the existing `onLoad`/`onError` handlers.

Also added `images.remotePatterns` for `render.albiononline.com` to
`next.config.ts` (AC #3): not required by any current code path (nothing
uses `next/image` against it today), but documents the one external image
origin the app ever fetches from server-side and keeps `next/image` usable
against it without an app-wide allowlist if a future surface (e.g. an
OG/share redesign) needs it.

## Consequences

- Icons on server-rendered pages now resolve correctly regardless of how
  fast the same-origin `/api/icon` proxy responds relative to hydration.
- No change to CORS/CSP or the proxy's rate limiting — those were already
  correct and not the cause.
- The fix lives in the shared `useIconStatus` hook, so both `ItemIcon` and
  `SpellIcon` (and any future consumer) get the same protection for free.
