import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createConnection, createDb } from "@/db/client";
import { runMigrations } from "@/db/migrate";
import * as schema from "@/db/schema";

/**
 * Exercises the real `@auth/drizzle-adapter` against a throwaway SQLite
 * file migrated with the app's own migrations, verifying that a first
 * Discord login (createUser + linkAccount, the adapter calls Auth.js makes
 * on first OAuth sign-in) produces a `user` row and a linked `account` row
 * as expected — covers AC#4 without requiring real Discord network calls.
 */
describe("DrizzleAdapter against the app schema", () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "acm-auth-adapter-"));
    dbPath = path.join(tmpDir, "test.db");
    runMigrations(dbPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates a users row and a linked accounts row on first login", async () => {
    const sqlite = createConnection(dbPath);
    const db = createDb(sqlite);
    const adapter = DrizzleAdapter(db, {
      usersTable: schema.users,
      accountsTable: schema.accounts,
      sessionsTable: schema.sessions,
      verificationTokensTable: schema.verificationTokens,
    });

    const createdUser = await adapter.createUser!({
      name: "Test User",
      email: "test@example.com",
      emailVerified: null,
    } as never);

    await adapter.linkAccount!({
      userId: createdUser.id,
      type: "oauth",
      provider: "discord",
      providerAccountId: "discord-user-123",
      access_token: "should-never-be-logged",
      refresh_token: "should-never-be-logged",
      token_type: "bearer",
      scope: "identify",
    } as never);

    const users = await db.select().from(schema.users);
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe("test@example.com");

    const accounts = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.userId, createdUser.id));
    expect(accounts).toHaveLength(1);
    expect(accounts[0].provider).toBe("discord");
    expect(accounts[0].providerAccountId).toBe("discord-user-123");

    sqlite.close();
  });
});
