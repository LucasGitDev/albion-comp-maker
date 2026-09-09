---
id: ACM-081
title: Garbage-collect orphaned background_images + per-user upload quota
status: To Do
assignee: []
created_date: '2026-09-08 01:35'
updated_date: '2026-09-09 03:07'
labels: []
milestone: m-6
dependencies: []
priority: medium
ordinal: 81000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
decision-018 flags two follow-ups from ACM-014: (1) background_images rows/files with no theme_json reference anywhere become orphaned when a user replaces a background — needs a periodic sweep that compares background_images against every build's theme_json.background.imageId and deletes both the row and the on-disk file for unreferenced ones (recent uploads must be exempt from a grace window so a build being actively edited but not yet saved is never GC'd out from under the user); (2) POST /api/background has no per-user quota — only the shared 30/min write rate limit — so a misbehaving/malicious account can accumulate ~172MB/hour of storage indefinitely. Add a simple count-based cap (e.g. reject new uploads past N background_images rows owned by the user) alongside or instead of GC.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Periodic or on-demand GC removes background_images rows/files unreferenced by any build.theme_json, with a grace window for very recent uploads
- [ ] #2 POST /api/background enforces a per-user quota (row count or total bytes) and returns a clear error when exceeded
<!-- AC:END -->
