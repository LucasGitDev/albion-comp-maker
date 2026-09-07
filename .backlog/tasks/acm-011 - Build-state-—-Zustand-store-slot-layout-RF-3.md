---
id: ACM-011
title: Build state — Zustand store + slot layout (RF-3)
status: To Do
assignee: []
created_date: '2026-09-07 13:32'
labels: []
milestone: m-2
dependencies:
  - ACM-005
ordinal: 11000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Zustand store for BuildState (schemaVersion, name, role, accent, slots, swaps). Slot panel showing all 9 slots. Serializable to/from JSON.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 BuildState matches type definition in PRD 5.5
- [ ] #2 Selecting item in a slot updates store
- [ ] #3 Selecting spells updates store
- [ ] #4 store.getState() returns serializable object (no functions, no undefined)
<!-- AC:END -->
