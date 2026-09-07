---
id: decision-012
title: Auth.js v5 database sessions and Node.js middleware runtime
date: '2026-09-07 17:17'
status: accepted
---
## Context

ACM-017 added Auth.js v5 with Discord OAuth on top of the SQLite + Drizzle
persistence layer established by decision-001/002/006 (comp_builds schema,
contentType strategy, SQLite + Drizzle for builds/comps). Auth.js v5 supports
two session strategies: `"jwt"` (stateless, signed cookie, no DB round-trip)
and `"database"` (session id cookie, session record looked up in the DB via
the adapter on every request).

The app's persistence is `better-sqlite3`, a native Node addon accessed
through `@auth/drizzle-adapter`. `next-auth`'s `auth()` wrapper is also used
directly as `src/middleware.ts`, which by default runs on the Next.js Edge
runtime. This choice was implemented (session strategy + middleware
`runtime: "nodejs"`) without a recorded decision, which CLAUDE.md requires
before writing code — this document closes that process gap retroactively
after ACM-017's review (PR #18) flagged it as a MEDIUM finding.

## Options considered

1. **JWT session strategy, Edge-compatible middleware (default Next.js path).**
   No DB lookup per request in middleware; middleware keeps running on Edge
   with its lower cold-start/latency profile. Requires an explicit `jwt`
   callback to shape the token, and an explicit `session` callback to copy
   trusted fields from the token onto `session.user`. Risk: the `jwt`
   callback receives the OAuth `account`/`profile` payload only on first
   sign-in but the token itself is otherwise attacker-adjacent input on
   every subsequent request (it round-trips through the client cookie); any
   field not explicitly re-pinned from the DB on each JWT refresh can in
   principle be influenced by a tampered or forged token if the callback
   logic is wrong.
2. **Database session strategy (chosen).** Session state lives server-side
   (`sessions` table via `@auth/drizzle-adapter`); the client only holds an
   opaque session id cookie. The `session` callback receives `{ session,
   user }` from the DB record — it never receives `account`, so OAuth
   access/refresh tokens are structurally absent from the callback that
   shapes the client-facing session; there is no code path by which they
   could leak into `session.user`. Requires a DB round-trip (via
   `better-sqlite3`, a native addon) on every session read, including in
   middleware, which cannot load on the Edge runtime — forcing
   `export const runtime = "nodejs"` (or `config.runtime = "nodejs"`) on
   `src/middleware.ts`. Confirmed empirically: `next build` failed under the
   default Edge runtime and passed once Node.js runtime was set.
3. **JWT strategy but skip middleware auth entirely, rely only on Server
   Action `requireSession()` checks.** Avoids the Edge/Node runtime question
   altogether. Rejected: removes the UX-level redirect for unauthenticated
   users hitting protected pages (they'd render and then fail inside a
   Server Action instead of being redirected at the edge of the route),
   which is a worse experience for no security gain, since Server Actions
   already self-check regardless of middleware.

## Decision

Use `session: { strategy: "database" }` in `src/auth/config.ts`, consistent
with the SQLite + Drizzle persistence already chosen in decision-001/002/006.
As a direct consequence, `src/middleware.ts` sets `config.runtime = "nodejs"`
instead of running on the default Edge runtime, since database-strategy
session lookups go through `@auth/drizzle-adapter` + `better-sqlite3`, a
native addon that cannot load on Edge.

## Consequences

**Tradeoff accepted — no Edge middleware:**
- Middleware for `/builds/:path*` and `/comp/new` now runs on the Node.js
  runtime, not Edge. Every matched request pays a full Node.js
  cold-start/execution cost plus a real SQLite lookup, instead of the
  low-latency Edge runtime with no DB hit (JWT strategy would have been
  effectively free at this layer).
- This constrains hosting: the app can no longer be deployed to an
  Edge-only or serverless-with-read-only-filesystem target (e.g. a platform
  that only offers Edge Functions, or a serverless FaaS without persistent
  local disk) as long as SQLite is the persistence layer, because
  `better-sqlite3` needs a writable local file and a Node.js process. Any
  future deployment target must guarantee a Node.js runtime with a durable,
  writable filesystem for the SQLite file, or persistence must change first.

**Security property this buys (per ACM-017 audit):** with the database
strategy, the `session` callback signature is `({ session, user })` — it
structurally never receives the OAuth `account` object (access_token,
refresh_token, id_token). There is no code path in `src/auth/config.ts` by
which those fields could be spread onto `session.user` and reach the
client, even by future accidental refactor of the callback, because the
callback simply never has them in scope. This is a real property of the
`"database"` strategy, not just an implementation convention we have to
remember to keep following.

**Migration hazard — if this project ever switches to `"jwt"`:** the `jwt`
strategy's `jwt` callback *does* receive `account`/`profile`/`user` on
first sign-in and thereafter operates on a token that round-trips through
the client. If a future change moves to JWT sessions, an explicit `jwt`
callback MUST pin `token.id` from the trusted DB user on every callback
invocation (not just first sign-in) and the `session` callback must copy
`session.user.id` only from that pinned `token.id` — never trust an
`id`-shaped field that could originate from client-supplied token content.
This matters because `session.user.id` is the **only** defense against
IDOR in ACM-018/019's Server Actions (the DB schema does not enforce
row-level ownership — see ACM-016 audit notes); if a JWT migration ever
lets a client-influenced value reach `session.user.id`, every Server Action
that scopes queries by `session.user.id` becomes an IDOR vector. Any PR
that changes `session.strategy` away from `"database"` must re-open this
decision and get explicit review of the `jwt` callback's id-pinning logic
before merge.

**Not the authorization boundary:** `src/middleware.ts`'s matcher
(`["/builds/:path*", "/comp/new"]`) and its unauthenticated-redirect are
UX-only defense-in-depth — a convenience redirect for the common case, not
a security control. The actual authorization boundary is each Server
Action's own `requireSession()` / `auth()` check, which runs regardless of
whether middleware matched the request. This was already true before this
decision (see ACM-017 task notes and `src/middleware.ts` comment) and is
restated here because it is easy to misread the Node.js runtime cost as
"the app now does its auth checking in middleware" — it does not.
