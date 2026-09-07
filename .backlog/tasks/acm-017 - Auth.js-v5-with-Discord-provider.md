---
id: ACM-017
title: Auth.js v5 with Discord provider
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 16:36'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. [Research] Confirm ACM-016 is Done or its schema.ts already defines the 4 adapter tables (users/accounts/sessions/verification_tokens) before starting - this task depends on that schema existing, not just on ACM-015. Flag to orchestrator if ACM-016 hasn't landed the adapter tables yet.
2. [Scaffold] Add next-auth@5 (beta channel per Auth.js v5) and @auth/drizzle-adapter to package.json (flag for devex-guard).
3. [Implement] Create src/auth.ts exporting { auth, signIn, signOut, handlers } from NextAuth(config), with providers: [Discord], adapter: DrizzleAdapter(db), session: { strategy: "database" } per decision-009.
4. [Implement] Create app/api/auth/[...nextauth]/route.ts exporting handlers.GET/POST.
5. [Implement] Create middleware.ts wrapping the auth() export, config.matcher scoped to exactly ["/builds/:path*", "/comp/new"], redirecting unauthenticated requests to "/" per decision-009 (allow-list matcher, not global).
6. [Implement] Add a sign-in entry point on "/" (Discord sign-in button calling signIn("discord")) - minimal, no dedicated /login page.
7. [Implement] For every existing/planned Server Action touching builds/comps, add the `const session = await auth(); if (!session?.user?.id) throw new Error("Unauthorized")` guard at the top, using session.user.id as the only trusted actor id.
8. [Test] Integration test hitting a protected route path without a session and asserting redirect to "/" - covers AC#3.
9. [Test] Test that a Server Action called with a mocked/no session throws Unauthorized, and with a mocked session returns session.user.id correctly - covers AC#2.
10. [Test] Test/manual-verify that first Discord login inserts a users row and a linked accounts row (adapter behavior) - covers AC#4. Full end-to-end Discord OAuth (AC#1) requires manual verification with real Discord app credentials in .env - write 1-3 manual test steps in the task before marking Done per CLAUDE.md Definition of Done.
11. [Verify] make check exits 0 on task branch.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
ATENCAO: decision-009 (Auth.js v5 Discord) foi criada vazia e marcada 'accepted' por engano, e removida. NAO existe decisao registrada sobre estrategia de sessao — spawn architect antes de implementar.

Decision: decision-009 (Auth.js v5 Discord OAuth session strategy) - database sessions via @auth/drizzle-adapter, not JWT; middleware allow-list matcher on /builds/:path* and /comp/new; Server Actions self-check auth() regardless of middleware. Risk: shares src/db/schema.ts and package.json with ACM-016 - serialize these two tasks per CLAUDE.md parallelism rule, do not implement concurrently. Risk: AC#1 (full Discord OAuth flow) needs real Discord app client id/secret in env and cannot be fully automated in CI - write manual verification steps before marking Done.
<!-- SECTION:NOTES:END -->
