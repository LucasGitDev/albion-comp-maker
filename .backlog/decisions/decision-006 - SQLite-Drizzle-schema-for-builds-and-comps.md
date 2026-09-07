---
id: decision-006
title: SQLite + Drizzle schema for builds and comps
status: accepted
date: 2026-09-07
---

## Decision

Persist app data in a single local SQLite file (via `better-sqlite3` + Drizzle ORM), with WAL journal mode. Seven tables total: four owned by the Auth.js Drizzle adapter (`users`, `accounts`, `sessions`, `verification_tokens`) and three app tables (`builds`, `comps`, `comp_builds`). Build content (equipped items per slot and spells per slot) is stored as a single validated JSON column on `builds`, not as further normalized item/spell-slot tables.

## Context

CLAUDE.md excludes a backend DB from v1 scope, but ACM-016/017 introduce accounts (Discord OAuth) and persistence for user-authored comps, which requires *some* store. SQLite is file-based and requires no server process, so it does not violate the "no backend DB" intent — there is still no client/server DB service, no ops burden, no network hop. This is the smallest persistence layer that satisfies the requirement.

Auth.js v5's Drizzle adapter expects `users`, `accounts`, `sessions`, `verificationTokens` tables with a fixed shape (see decision-007 for why database sessions were chosen, which is what makes `sessions` mandatory here). These four are generated from the official Drizzle adapter schema helper (`@auth/drizzle-adapter`), not hand-rolled, so their column names/types must not be edited independently of the adapter version in use.

A build's content (12 equipment slots, up to 4 spell slots per weapon/offhand, tier/enchant per item) is a fixed-shape nested object with no independent query needs (we never filter comps by "which spell is in slot Q of build X" server-side — all such logic runs client-side against `ao-data.json`). Normalizing it into `build_items` / `build_spells` child tables would add five more tables and joins for zero query benefit, and would require an application-level migration every time the equipment slot list changes shape. Storing it as one JSON column keeps the schema stable and pushes shape validation to a Zod schema shared between the Server Action input and the read path.

## Schema

### `users` (Auth.js-owned)
- `id` TEXT PK (adapter-generated, UUID)
- `name` TEXT
- `email` TEXT UNIQUE
- `emailVerified` INTEGER (timestamp, ms) nullable
- `image` TEXT nullable

### `accounts` (Auth.js-owned)
- Standard OAuth account row per adapter spec: `userId`, `type`, `provider`, `providerAccountId`, `refresh_token`, `access_token`, `expires_at`, `token_type`, `scope`, `id_token`, `session_state`.
- Composite PK `(provider, providerAccountId)`.

### `sessions` (Auth.js-owned)
- `sessionToken` TEXT PK
- `userId` TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `expires` INTEGER (timestamp, ms) NOT NULL

### `verification_tokens` (Auth.js-owned)
- `identifier`, `token`, `expires` — composite PK `(identifier, token)`. Unused with Discord-only OAuth today but required by the adapter's generated schema; left in place rather than hand-pruning generated code.

### `builds`
- `id` TEXT PK (nanoid)
- `user_id` TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `name` TEXT NOT NULL
- `role` TEXT nullable (free text, mirrors decision-002's free-text pattern — no DB enum)
- `content` TEXT NOT NULL — JSON, shape:
  ```ts
  {
    items: Partial<Record<Slot, { uniqueName: string; tier: number; enchant: number }>>,
    spells: Partial<Record<Slot, { q?: string; w?: string; e?: string; passive?: string }>>
  }
  ```
  Validated by a shared Zod schema (`buildContentSchema`) on every write; DB layer does not interpret the JSON.
- `created_at` INTEGER (timestamp, ms) NOT NULL, default `(unixepoch() * 1000)`
- `updated_at` INTEGER (timestamp, ms) NOT NULL, updated by application on every write (no DB trigger, to keep logic in one place — Drizzle app code)

### `comps`
- `id` TEXT PK (nanoid)
- `user_id` TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
- `name` TEXT NOT NULL
- `content_type` TEXT nullable — free text per decision-002
- `created_at` / `updated_at` INTEGER, same convention as `builds`

### `comp_builds`
- `id` TEXT PK (nanoid) — surrogate key per decision-001
- `comp_id` TEXT NOT NULL REFERENCES comps(id) ON DELETE CASCADE
- `build_id` TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE
- `position` INTEGER NOT NULL — 0-based ordering within the comp
- `count` INTEGER NOT NULL DEFAULT 1 — number of players running this build at this position
- Index: `(comp_id, build_id)` non-unique (decision-001)
- Unique index: `(comp_id, position)`

## Connection setup

- Driver: `better-sqlite3`, wrapped by `drizzle-orm/better-sqlite3`.
- On every connection open, execute in order: `PRAGMA journal_mode = WAL;`, `PRAGMA foreign_keys = ON;`, `PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;`. `foreign_keys` is OFF by default per-connection in SQLite and must be set every time, not just once at file creation.
- DB file path comes from `process.env.DATABASE_PATH`, defaulting to `./data/app.db` in development. The `data/` directory is gitignored; `DATABASE_PATH` must be an absolute or CWD-relative path resolvable at server start.

## Migration strategy

- `drizzle-kit` generates SQL migrations into `drizzle/` from the TypeScript schema (`src/db/schema.ts`) via `drizzle-kit generate`.
- Migrations run at server startup (Next.js `instrumentation.ts` hook calling `migrate()` from `drizzle-orm/better-sqlite3/migrator`) — not as a manual CI step — so a fresh checkout with an empty DB file self-migrates on first request. This matches AC#1 ("All 7 tables created by drizzle-kit migrate on empty DB") while keeping local dev frictionless.
- The Auth.js adapter tables are defined in `src/db/schema.ts` using `@auth/drizzle-adapter`'s exported schema factory so they migrate through the same `drizzle-kit` pipeline as the app tables, rather than a second migration system.
- No down-migrations are authored by hand for v1; `drizzle-kit` migrations are additive-only during this phase (no production data to preserve yet). This will be revisited before any schema change that drops or renames a column once real user data exists.

## Consequences

- Adding a new equipment slot or spell type requires no migration — it is purely a change to the shared Zod schema and TypeScript `Slot` union, plus a data backfill concern only if old JSON rows must be reshaped (none needed for purely additive changes).
- Any query that needs to filter/sort by something inside `content` (e.g., "find all builds using item X") must be done in application code after loading rows, not via SQL `WHERE` on JSON fields, until/unless such a query pattern proves to be a real bottleneck — at which point a dedicated indexed column (e.g., `builds.primary_item` extracted at write time) would be added.
- The Auth.js adapter tables are treated as generated/vendored: do not hand-edit their column list without checking the adapter version's expected shape first, since a mismatch breaks login silently.
