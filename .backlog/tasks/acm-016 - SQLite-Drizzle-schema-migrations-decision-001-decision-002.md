---
id: ACM-016
title: 'SQLite + Drizzle schema + migrations (decision-001, decision-002)'
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
labels: []
milestone: m-5
dependencies:
  - ACM-015
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create Drizzle schema per PRD 5.2 with decisions applied: comp_builds uses surrogate PK, content_type is free text. WAL PRAGMAs on connection init. drizzle-kit migrations in drizzle/ dir.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All 7 tables created by drizzle-kit migrate on empty DB
- [ ] #2 WAL + busy_timeout + foreign_keys + synchronous=NORMAL set on connection
- [ ] #3 comp_builds has nanoid PK, (comp_id,build_id) non-unique index, (comp_id,position) unique index
- [ ] #4 DATABASE_PATH env var controls file location
<!-- AC:END -->
