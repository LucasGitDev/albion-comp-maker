---
id: ACM-017
title: Auth.js v5 with Discord provider
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
labels: []
milestone: m-5
dependencies:
  - ACM-015
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
NextAuth v5 configured with Discord OAuth. Uses Drizzle adapter. Session stored in DB. Middleware protects /builds and /comp/new routes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Discord login flow works end-to-end
- [ ] #2 Session accessible in Server Actions via auth()
- [ ] #3 Unauthenticated access to protected routes redirects to /
- [ ] #4 User row created in users table on first login
<!-- AC:END -->
