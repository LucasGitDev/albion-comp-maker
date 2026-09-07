import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createConnection } from "@/db/client";

describe("createConnection PRAGMAs", () => {
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "acm-db-pragmas-"));
    dbPath = path.join(tmpDir, "test.db");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("sets journal_mode=WAL, foreign_keys=ON, busy_timeout=5000, synchronous=NORMAL", () => {
    const sqlite = createConnection(dbPath);
    try {
      expect(sqlite.pragma("journal_mode", { simple: true })).toBe("wal");
      expect(sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
      expect(sqlite.pragma("busy_timeout", { simple: true })).toBe(5000);
      // NORMAL maps to 1 in SQLite's synchronous PRAGMA.
      expect(sqlite.pragma("synchronous", { simple: true })).toBe(1);
    } finally {
      sqlite.close();
    }
  });
});
