import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

/**
 * Auth.js (next-auth v5) Drizzle adapter tables.
 *
 * These are hand-written to match the exact shape produced by
 * `@auth/drizzle-adapter`'s sqlite schema factory (table names, column
 * names/types, and keys). ACM-017 wires the actual `@auth/drizzle-adapter`
 * package against these tables; do not rename columns or tables here without
 * re-checking the adapter version's expected shape (see decision-006).
 */
export const users = sqliteTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = sqliteTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (verificationToken) => [
    primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);

/**
 * App tables (decision-006).
 */
export const builds = sqliteTable(
  "builds",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Set once at creation (name + random suffix) and never regenerated
    // afterwards (ACM-018 AC#1) — links/shares stay stable across edits.
    slug: text("slug").notNull(),
    // Free text, no DB enum — mirrors decision-002's pattern.
    role: text("role"),
    // JSON blob. Writes go through `buildStateSchema` in
    // `src/lib/build-schema.ts` (size cap + strict shape, decision-013)
    // before landing here. Reads must stay tolerant of rows written before
    // that schema existed — see `parseBuildContent` in the same module.
    // The DB layer itself does not interpret this column's contents.
    content: text("content").notNull(),
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
    // Self-reference: set when this row was created via "fork" from another
    // user's public build (ACM-018 AC#4). Null for builds not forked.
    forkedFrom: text("forked_from").references((): AnySQLiteColumn => builds.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [uniqueIndex("builds_slug_idx").on(table.slug)],
);

export const comps = sqliteTable("comps", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Free text per decision-002 — no DB-level CHECK constraint.
  contentType: text("content_type"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const compBuilds = sqliteTable(
  "comp_builds",
  {
    // Surrogate PK per decision-001: a comp can contain the same build more
    // than once, at distinct positions.
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    compId: text("comp_id")
      .notNull()
      .references(() => comps.id, { onDelete: "cascade" }),
    buildId: text("build_id")
      .notNull()
      .references(() => builds.id, { onDelete: "cascade" }),
    // 0-based ordering within the comp.
    position: integer("position").notNull(),
    // Number of players running this build at this position.
    count: integer("count").notNull().default(1),
  },
  (table) => [
    // Non-unique per decision-001 — the same build may appear at multiple
    // positions within a comp.
    index("comp_builds_comp_id_build_id_idx").on(table.compId, table.buildId),
    // No two rows share the same position within a comp.
    uniqueIndex("comp_builds_comp_id_position_idx").on(
      table.compId,
      table.position,
    ),
  ],
);
