/**
 * Seeds a throwaway user + database-strategy session directly into the
 * SQLite DB and prints the session token, for scripts/verify-breadcrumb-overflow.ts
 * (see that file's header for full usage). Never used in the app itself —
 * dev/verification convenience only.
 */
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";

const dbPath = process.env.DATABASE_PATH ?? "./data/verify.db";
const db = new Database(dbPath);

const userId = randomUUID();
const sessionToken = randomUUID();
const expires = Date.now() + 1000 * 60 * 60;

db.prepare(
  `INSERT INTO user (id, name, email) VALUES (?, ?, ?)`,
).run(userId, "Verify User", `verify-${userId}@example.com`);

db.prepare(
  `INSERT INTO session (sessionToken, userId, expires) VALUES (?, ?, ?)`,
).run(sessionToken, userId, expires);

process.stdout.write(sessionToken);
