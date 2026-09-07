---
id: decision-002
title: contentType field strategy — free text vs enum
status: accepted
date: 2026-09-07
---

## Decision

`comps.content_type` is a free-text field (no DB-level enum constraint) but the UI offers a predefined list: `zvz | group | smallscale | ganking | corrupted | other`.

## Context

SQLite has no native ENUM type. Enforcing a list at the application layer (Zod schema on Server Actions) is sufficient and easier to extend when new content types emerge. A fixed enum in a migration is a schema change every time the game meta shifts.

## Consequences

- DB column: `TEXT`, nullable.
- Zod validation on all write paths: `z.enum(['zvz','group','smallscale','ganking','corrupted','other']).optional()`.
- UI renders a `<select>` with those options plus a blank default.
- Unknown values from future imports are accepted and displayed as-is; they just don't match any filter.
