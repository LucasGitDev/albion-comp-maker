---
id: ACM-032
title: Migrate middleware.ts to proxy convention (Next.js 16 deprecation)
status: To Do
assignee: []
created_date: '2026-09-07 17:27'
updated_date: '2026-09-07 17:27'
labels: []
dependencies: []
priority: high
ordinal: 32000
---

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Warning: 'middleware' file convention deprecated in Next.js 16. Migrate via: npx @next/codemod@canary middleware-to-proxy . — Ref: https://nextjs.org/docs/messages/middleware-to-proxy. Run codemod, verify make check verde, commit fix(config): migrate middleware to proxy convention.
<!-- SECTION:NOTES:END -->
