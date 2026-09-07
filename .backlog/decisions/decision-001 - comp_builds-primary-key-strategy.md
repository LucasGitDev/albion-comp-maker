---
id: decision-001
title: comp_builds primary key strategy
status: accepted
date: 2026-09-07
---

## Decision

Use a surrogate serial/nanoid PK on `comp_builds` instead of a composite `(comp_id, build_id)` PK.

## Context

A comp can contain the same build more than once (e.g., two identical healer builds at different positions). A composite PK on `(comp_id, build_id)` would block that. The PRD's `count` field partially addresses multiplicity, but `count` means "N players use this build in the comp" — it does not mean "this build appears at N different positions." Future UX may allow the same build template at distinct positions.

## Consequences

- `comp_builds.id` is TEXT (nanoid), PK.
- `(comp_id, build_id)` becomes a non-unique index (allows same build multiple times per comp).
- `(comp_id, position)` remains a unique index (no two rows share the same position in a comp).
- Deletion by position is unambiguous; no need to specify build_id.
