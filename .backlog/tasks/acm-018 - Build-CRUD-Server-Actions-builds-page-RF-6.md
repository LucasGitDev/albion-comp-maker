---
id: ACM-018
title: Build CRUD Server Actions + /builds page (RF-6)
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
labels: []
milestone: m-5
dependencies:
  - ACM-015
ordinal: 18000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Save, list, edit, delete, duplicate, toggle public/private, fork builds. /[locale]/builds page listing owner's builds.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Save build: creates row with nanoid id, immutable slug (name + random suffix)
- [ ] #2 Edit build: validates session.user.id === owner_id
- [ ] #3 Duplicate: copies data_json to new row with new slug
- [ ] #4 Fork: copies to authenticated user's library, sets forked_from
- [ ] #5 Toggle public: flips is_public flag
- [ ] #6 Delete: hard delete, only by owner
- [ ] #7 Rate limit: max 30 writes/min per user
<!-- AC:END -->
