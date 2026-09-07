/**
 * Runs pending Drizzle migrations once at server startup (Node.js runtime
 * only — the `register()` hook also fires for the edge runtime, e.g.
 * middleware, where `better-sqlite3` cannot run).
 *
 * ACM-016 deliberately left this file uncreated; wiring it here was handed
 * off to ACM-017 (see ACM-016 implementation notes / decision-006).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("@/db/migrate");
    runMigrations();
  }
}
