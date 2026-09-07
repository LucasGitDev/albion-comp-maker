import { describe, expect, it, vi } from "vitest";

const { mockAuth } = vi.hoisted(() => ({ mockAuth: vi.fn() }));

// `@/auth/config` calls `NextAuth(...)` and `DrizzleAdapter(getDb())` at
// module load time, which would require real Discord env vars and a live DB
// connection. `requireSession` (src/auth/session.ts) only depends on the
// `auth` export from `@/auth/config`, so mock just that module — this keeps
// the guard logic under real test coverage without ever loading next-auth.
vi.mock("@/auth/config", () => ({
  auth: mockAuth,
}));

describe("requireSession", () => {
  it("throws Unauthorized when there is no session", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const { requireSession } = await import("@/auth/session");

    await expect(requireSession()).rejects.toThrow("Unauthorized");
  });

  it("throws Unauthorized when the session has no user id", async () => {
    mockAuth.mockResolvedValueOnce({ user: {}, expires: "" });
    const { requireSession } = await import("@/auth/session");

    await expect(requireSession()).rejects.toThrow("Unauthorized");
  });

  it("returns the session with session.user.id when authenticated", async () => {
    const session = { user: { id: "user-1" }, expires: "" };
    mockAuth.mockResolvedValueOnce(session);
    const { requireSession } = await import("@/auth/session");

    await expect(requireSession()).resolves.toEqual(session);
  });
});
