---
id: ACM-032
title: Migrate middleware.ts to proxy convention (Next.js 16 deprecation)
status: In Progress
assignee: []
created_date: '2026-09-07 17:27'
updated_date: '2026-09-07 17:43'
labels: []
dependencies: []
priority: high
ordinal: 32000
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 src/middleware.ts renomeado para a convencao proxy (src/proxy.ts) via codemod oficial
- [ ] #2 Auth allow-list matcher /builds/:path* e /comp/new preservado, incluindo runtime nodejs
- [ ] #3 Build do Next.js nao emite mais o warning de deprecacao de middleware
- [ ] #4 make check verde; nenhuma alteracao em package.json ou lockfile
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Warning: 'middleware' file convention deprecated in Next.js 16. Migrate via: npx @next/codemod@canary middleware-to-proxy . — Ref: https://nextjs.org/docs/messages/middleware-to-proxy. Run codemod, verify make check verde, commit fix(config): migrate middleware to proxy convention.
<!-- SECTION:NOTES:END -->
