import { afterEach, describe, expect, it, vi } from "vitest";

const runMigrations = vi.fn();

vi.mock("@/db/migrate", () => ({
  runMigrations,
}));

describe("instrumentation register()", () => {
  const originalRuntime = process.env.NEXT_RUNTIME;

  afterEach(() => {
    process.env.NEXT_RUNTIME = originalRuntime;
    runMigrations.mockClear();
    vi.resetModules();
  });

  it("runs pending migrations when the Node.js runtime registers", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    const { register } = await import("@/instrumentation");

    await register();

    expect(runMigrations).toHaveBeenCalledTimes(1);
  });

  it("does not run migrations for the edge runtime", async () => {
    process.env.NEXT_RUNTIME = "edge";
    const { register } = await import("@/instrumentation");

    await register();

    expect(runMigrations).not.toHaveBeenCalled();
  });
});
