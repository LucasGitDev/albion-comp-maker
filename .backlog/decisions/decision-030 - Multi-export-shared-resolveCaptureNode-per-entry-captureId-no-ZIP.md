---
id: decision-030
title: 'Multi-export: shared resolveCaptureNode + per-entry captureId, no ZIP'
date: '2026-09-10 01:33'
status: accepted
---
## Context

ACM-020 requires two export targets on the public `/comp/[slug]` page: a
single PNG of the whole comp, and one PNG per build (no ZIP). ACM-118's audit
found two blockers: (1) `ExportBar` and `EditorActionBar` each hardcoded a
local `resolveCaptureNode` that only ever looked up the literal
`#capture-root`, while `/comp/[slug]` already renders each `BuildCard` with
`captureId={`capture-root-${entry.compBuildId}`}` — so `ExportBar` would
always resolve `null` there; (2) `ExportBar` was fully implemented but never
mounted on any production route besides the editor.

## Decision

1. Promote `resolveCaptureNode(container, captureId)` to a single exported
   helper in `src/lib/export-png.ts`. It resolves `captureId` either as the
   container itself (`container.id === captureId`) or as a nested
   `#<captureId>` descendant, else `null`. `ExportBar` and
   `EditorActionBar` both delegate to it instead of duplicating the lookup.
2. `ExportBar` gains an optional `captureId?: string` prop, defaulting to
   `"capture-root"` so the existing `/build/[id]` single-card contract is
   unchanged.
3. A new client component, `CompExportView`, wraps the public comp page's
   build grid in a single container carrying `id="capture-root-full-comp"`
   and exposes: (a) one "Baixar comp completa (PNG)" button that captures
   that whole container, and (b) one `ExportBar` per entry, each pointed at
   the shared container ref with `captureId="capture-root-{compBuildId}"`
   (the id each `BuildCard` already renders). No ZIP: every per-build export
   is an individual download click, matching AC#2 literally.
4. The owner-facing `/comps/[id]` management page (`CompBuildsManager`)
   never renders a `BuildCard`/capture root and is out of scope here — both
   export entry points live on the public `/comp/[slug]` read view.

## Consequences

- One selector contract (`captureId`) is now shared by every export
  surface; a future capture root naming change only needs to touch
  `resolveCaptureNode` call sites, not three independent implementations.
- `CompExportView` computes rasterized size proportional to build count;
  very large comps could hit browser memory/time limits on the full-comp
  export — explicitly deferred, not handled by ACM-020.
- `getPublicCompBySlug` already 404s comps with zero builds, so
  `CompExportView` never needs an empty-state variant of the full-comp
  button.
