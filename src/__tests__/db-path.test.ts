import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveDatabasePath } from "@/db/client";

describe("resolveDatabasePath (DATABASE_PATH env var)", () => {
  let tmpDir: string;
  const originalEnv = process.env.DATABASE_PATH;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "acm-db-path-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (originalEnv === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = originalEnv;
    }
  });

  it("resolves to the DATABASE_PATH env var and ensures its directory exists", () => {
    const target = path.join(tmpDir, "nested", "custom.db");
    process.env.DATABASE_PATH = target;

    const resolved = resolveDatabasePath();

    expect(resolved).toBe(path.resolve(target));
    expect(fs.existsSync(path.dirname(resolved))).toBe(true);
  });
});
