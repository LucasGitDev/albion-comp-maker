---
id: ACM-019
title: Comp CRUD + comp_builds ordering (RF-7)
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
labels: []
milestone: m-6
dependencies:
  - ACM-016
  - ACM-018
ordinal: 19000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Comp entity: create, edit, delete, drag-reorder builds within comp. Each comp_builds row has position, label, count.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Create comp: nanoid id, immutable slug
- [ ] #2 Add build to comp from user library or public search
- [ ] #3 Drag reorder updates position in DB
- [ ] #4 count field editable per comp_builds row
- [ ] #5 label field editable inline
<!-- AC:END -->
