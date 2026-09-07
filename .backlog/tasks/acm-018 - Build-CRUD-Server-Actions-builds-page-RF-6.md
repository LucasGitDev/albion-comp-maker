---
id: ACM-018
title: Build CRUD Server Actions + /builds page (RF-6)
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 17:48'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
SECURITY (from ACM-016 audit, MEDIUM): builds/comps ownership is not enforced by the schema. Every CRUD Server Action must scope queries by the session user_id — never trust an id from the client alone (IDOR). Add a test proving a user cannot read/update/delete another user's build.

SECURITY (ACM-017 audit, MEDIUM): middleware matcher is ['/builds/:path*','/comp/new'] and is explicitly UX-only defense-in-depth, NOT the authorization boundary. Every Server Action must call requireSession() itself — matchers drift silently as routes are added. Add a regression test asserting Server Actions reject unauthenticated calls regardless of middleware.

SECURITY (auditoria ACM-032, MEDIUM): hoje src/proxy.ts e o UNICO limite de autenticacao real para /builds/:path* e /comp/new. O comentario no arquivo afirma que 'Server Actions self-check auth() regardless' — isso e ASPIRACIONAL, nao verdadeiro: 'grep -rn "use server" src' nao retorna nada, nenhuma Server Action existe ainda. src/auth/session.ts expoe requireSession() mas NINGUEM o chama. Ao implementar as mutations desta task, chamar requireSession() explicitamente em cada Server Action / route handler — nao confiar no proxy como unica defesa. Verificado contra Next 16.3.4.
<!-- SECTION:NOTES:END -->
