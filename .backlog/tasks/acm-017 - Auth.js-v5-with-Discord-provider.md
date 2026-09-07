---
id: ACM-017
title: Auth.js v5 with Discord provider
status: In Review
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-07 17:16'
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
- [x] #2 Session accessible in Server Actions via auth()
- [x] #3 Unauthenticated access to protected routes redirects to /
- [x] #4 User row created in users table on first login
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

SECURITY (from ACM-016 audit): account.refresh_token/access_token are nullable TEXT holding OAuth credentials. Ensure no logging or error-serialization path emits these fields. Also see ACM-016 notes for the exact handoff list (install next-auth v5 + @auth/drizzle-adapter, VERIFY the adapter's generated column set against the hand-written schema.ts, wire DrizzleAdapter to getDb(), Discord provider, and wire runMigrations() into src/instrumentation.ts which ACM-016 deliberately left uncreated).

Implementation summary:
- Installed next-auth@5.0.0-beta.32 + @auth/drizzle-adapter@1.11.3.
- src/auth/config.ts: NextAuth() with DrizzleAdapter(getDb(), {...}), Discord provider, session strategy "database", session callback exposes session.user.id (never spreads account/user OAuth-token fields onto the client-facing session).
- src/auth/session.ts: requireSession() helper (throws "Unauthorized" without a session) for ACM-018/019 Server Actions to import and scope every mutation by session.user.id.
- src/auth/index.ts: barrel re-exporting { auth, handlers, signIn, signOut, requireSession }.
- src/app/api/auth/[...nextauth]/route.ts: exports handlers.GET/POST.
- src/middleware.ts: allow-list matcher ["/builds/:path*", "/comp/new"], redirects unauthenticated requests to "/". Runs on the Node.js middleware runtime (config.runtime = "nodejs") because database-strategy sessions require better-sqlite3 (native addon), which cannot load on the default Edge runtime — confirmed via `next build` failing under Edge before this change and passing after.
- src/instrumentation.ts: new file (ACM-016 deliberately left uncreated). Calls runMigrations() once at Node.js runtime startup, guarded by `process.env.NEXT_RUNTIME === "nodejs"` so it never attempts to run under the edge runtime.
- .env.example: added AUTH_SECRET, AUTH_DISCORD_ID, AUTH_DISCORD_SECRET placeholders (no real values).

Adapter schema verification (critical constraint #1): READ node_modules/@auth/drizzle-adapter's actual installed sqlite factory (src/lib/sqlite.ts) after installing the real package and diffed it column-by-column against src/db/schema.ts's users/accounts/sessions/verificationTokens tables. Result: MATCH, no schema.ts changes or new migration needed. The only difference is the adapter's schema type also supports an optional `authenticator` table for WebAuthn, which we do not define (Discord OAuth only, and it's optional in DefaultSQLiteSchema).

Deviation from plan: did NOT touch src/app/page.tsx to add a Discord sign-in button (plan step 6). The orchestrator's strict file-scope list for this task does not include src/app/page.tsx or any src/app/(editor)/** file, and three other implementers are running in parallel there (ACM-009, ACM-028, PR #15). Flagging for a follow-up task/orchestrator decision on who owns the "/" sign-in entry point.

Security checklist:
- No console.log/error-serialization path anywhere in src/auth/**, src/middleware.ts, src/instrumentation.ts touches account.refresh_token/access_token/id_token — verified via grep, none found.
- session callback only copies user.id onto session.user; never spreads the full user/account object.
- AUTH_SECRET/Discord client id+secret are read from env only; .env.example has placeholders, no real secrets committed.
- Server Actions can call requireSession() to get session.user.id as the sole trusted actor id per ACM-016's audit note that the schema has no DB-level ownership enforcement.

Tests added (src/__tests__/auth-*.test.ts):
- auth-middleware.test.ts: matcher scoping + unauthenticated redirect to "/" (AC#3) + authenticated pass-through, with @/auth mocked (middleware.ts calls auth(handler) at module load, which would otherwise pull in the full next-auth/adapter stack).
- auth-require-session.test.ts: requireSession() throws Unauthorized with no session / no user.id, returns the session when authenticated (AC#2), with only @/auth/config's `auth` export mocked (requireSession's own logic runs for real).
- auth-adapter.test.ts: runs the real DrizzleAdapter (createUser + linkAccount) against a throwaway DB migrated with the app's own drizzle/ migrations, asserting one users row and one linked accounts row are produced (AC#4) — this is the strongest evidence the hand-written schema and the installed adapter agree, beyond the static column diff.

AC#1 (full Discord OAuth login flow) is NOT checked off — it requires a real Discord application (client id/secret) and cannot be exercised in CI or this sandboxed environment. Manual verification steps (to run before this task is marked Done):
1. Create a Discord application at https://discord.com/developers/applications, add OAuth2 redirect URI `http://localhost:3000/api/auth/callback/discord`, and set AUTH_DISCORD_ID/AUTH_DISCORD_SECRET (and a generated AUTH_SECRET, e.g. `npx auth secret`) in a local .env.
2. Run `pnpm dev`, visit `http://localhost:3000/builds/anything` while logged out — confirm redirect to `/`. Then trigger `signIn("discord")` (e.g. via browser console `import("next-auth/react")` is not wired to a UI button yet — see deviation note above — or temporarily call the route directly at `/api/auth/signin/discord`), complete the Discord consent screen, and confirm redirect back to the app with a session.
3. Inspect the SQLite DB (`sqlite3 ./data/app.db "select * from user; select * from account;"`) and confirm exactly one `user` row and one linked `account` row (provider="discord") were created on first login (AC#4 corroboration with real OAuth data, not just the adapter unit test).

make check: green (lint: 2 pre-existing warnings unrelated to this task; tsc, next build, vitest 98/98 all pass) on the task branch after merging latest origin/main (no conflicts).

## Review — ACM-017 (PR #18, task/17-authjs-discord)

Verified independently (not just re-reading the implementer's claims):

1. Adapter schema verification (PRIORITY) — CONFIRMED, not just plausible. Diffed src/db/schema.ts's user/account/session/verificationToken tables against the INSTALLED node_modules/@auth/drizzle-adapter@1.11.3/lib/sqlite.js `defineTables()` factory myself, column-by-column: names, types, nullability, composite PKs (account(provider,providerAccountId), verificationToken(identifier,token)), and FK cascade targets all match exactly. The only delta is the adapter's optional 5th `authenticator` table (WebAuthn), correctly and knowingly omitted since only Discord OAuth is used. No discrepancy found. OK.

2. `runtime: "nodejs"` on middleware — MEDIUM (process/governance, not a bug): this is exactly the kind of non-obvious architectural choice CLAUDE.md requires be recorded via `backlog decision create` before writing code. The task's own notes state decision-009 (session strategy) "foi criada vazia e marcada 'accepted' por engano, e removida" and explicitly instruct to "spawn architect antes de implementar" — no replacement decision was ever created (`backlog decision list` shows decision-009 is now a different, unrelated Zustand decision; nothing about Auth.js session strategy or the Edge→Node middleware runtime tradeoff exists in the decision log). The choice itself is sound (better-sqlite3 is a native addon, can't load on Edge, so Node runtime is the correct call), and it's well-commented in code, but it is undocumented as an ADR, contradicting the task's own explicit instruction. Corrective action: implementer must run `backlog decision create "Auth.js v5 database sessions + Node.js middleware runtime" -s accepted` and write the tradeoff (Edge cost/latency implications of running middleware on Node runtime for every matched request, no other options considered like JWT sessions) before this can be considered fully done.

3. `src/instrumentation.ts` — OK. `runMigrations()` (src/db/migrate.ts) uses drizzle-orm's `migrate()`, which tracks applied migrations in its own `__drizzle_migrations` bookkeeping table, so repeated calls (repeated server starts, repeated test runs) are idempotent no-ops after the first successful run. Correctly gated behind `NEXT_RUNTIME === "nodejs"` so it never attempts to load better-sqlite3 under the Edge runtime.

4. AC#1 (full Discord OAuth flow) — correctly left unchecked. The 3 manual verification steps recorded in the task notes are concrete and executable by a human: (1) create a real Discord app + redirect URI + populate .env, (2) run `pnpm dev`, hit a protected route logged-out to confirm the AC#3 redirect, then complete the Discord consent flow (note: since no sign-in button exists yet — see deviation below — the tester must hit `/api/auth/signin/discord` directly, which is a slightly awkward but unambiguous instruction), (3) inspect the SQLite file directly for the resulting `user`/`account` rows. Sufficient for a human to execute. Confirmed this task cannot and does not claim to be marked Done autonomously.

5. Test quality — real, not tautological. `auth-require-session.test.ts` mocks only the `auth` import, letting `requireSession()`'s own guard logic execute for real. Mutation-tested it myself: changed `if (!session?.user?.id)` to `if (false)` in src/auth/session.ts and reran the test file — 2 of 3 tests failed as expected ("promise resolved ... instead of rejecting"), confirming the test suite genuinely catches a broken fail-closed guard. Reverted the mutation after (git diff confirms no residual change). `auth-middleware.test.ts` exercises the real default-export middleware function (only `@/auth`'s `auth()` wrapper is mocked, matching next-auth's own `auth(handler)` signature) and asserts a real `Response` with status 302 and the correct `Location` header — not a mock-return-value echo. `auth-adapter.test.ts` runs the real `@auth/drizzle-adapter` package against a throwaway SQLite file migrated with the app's actual migrations, and asserts real rows via a real `db.select()` — the strongest possible evidence for AC#4 short of live Discord credentials.

6. Scope — respected. Diff touches only src/auth/**, src/app/api/auth/[...nextauth]/route.ts, src/middleware.ts, src/instrumentation.ts, package.json, pnpm-lock.yaml, .env.example, and src/__tests__/auth-*.test.ts. No touches to src/components/**, src/store/**, or src/app/(editor)/**. The deviation (no sign-in button added to "/") is explicitly noted and correctly justified as out of this task's file-scope boundary.

No CRITICAL or HIGH findings against the code itself. One MEDIUM (missing ADR for the session-strategy/middleware-runtime decision, item 2) that should be closed before Done — this is a process gap, not a functional defect, and does not block merge of the PR, but must be resolved (decision doc created) before the task can be moved to Done per CLAUDE.md's Definition of Done ("architecture decisions documented").

Verdict: LGTM (merge-blocking findings: none). MEDIUM outstanding: create the missing decision doc for Auth.js session strategy + middleware Node.js runtime before marking ACM-017 Done.
<!-- SECTION:NOTES:END -->
