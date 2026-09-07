---
id: ACM-019
title: Comp CRUD + comp_builds ordering (RF-7)
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 17:05'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SECURITY (from ACM-016 audit, MEDIUM): comp_builds has independent FKs to comps.id and builds.id with NO constraint that both rows share the same user_id. Without an app-layer ownership check before inserting into comp_builds, a user can attach ANOTHER USER'S build to their own comp. Required: verify ownership of both the comp and the build in the Server Action before insert, and cover it with a test that attempts the cross-user attach and expects rejection.
<!-- SECTION:NOTES:END -->
