---
id: decision-009
title: 'Zustand build store: separate state and actions for serializable getState()'
date: '2026-09-07 16:51'
status: accepted
---
## Context

ACM-011 AC #4 requires `store.getState()` to return a fully JSON-serializable
object (no functions, no `undefined`). A flat Zustand store (`create<BuildState & Actions>()`)
puts action functions as sibling keys of the data, so `getState()` always
contains functions and any naive `JSON.stringify(store.getState())` breaks or
needs manual stripping before every serialization site (export, persistence,
comp assembly in later phases).

## Decision

The store shape is `{ build: BuildState; actions: BuildActions }`. `build` is
the only serializable slice and is what `selectBuild(store.getState())`
returns. All mutations live under `actions` and are never mixed into `build`.
`slots` is always a dense `Record<Slot, EquippedItem | null>` with all 10 keys
present (never sparse, never `undefined` values) so round-tripping through
`JSON.stringify`/`JSON.parse` is lossless and slot order is driven by the
`SLOT_ORDER` constant in `src/lib/slot-layout.ts`, not `Object.keys`.

## Consequences

- Any code that needs to serialize/export/persist the build reads
  `selectBuild(store.getState())`, never the whole store.
- Components that need to call actions subscribe to `state => state.actions`
  (or a specific action) so they don't over-render on every `build` change.
- `SLOT_ORDER` is shared between the editor grid (ACM-011) and the exported
  card layout (ACM-013) to keep preview and PNG export in sync.

