import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import Discord from "next-auth/providers/discord";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
    };
  }
}

/**
 * Auth.js v5 configuration (decision: database sessions via
 * `@auth/drizzle-adapter`, not JWT — see task ACM-017 notes).
 *
 * The adapter's generated sqlite table shape (user/account/session/
 * verificationToken) was verified against the hand-written tables in
 * `src/db/schema.ts` (ACM-016) after installing the real package: they match
 * column-for-column. The adapter also optionally supports an `authenticator`
 * table for WebAuthn, which we do not define or use (Discord OAuth only).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(getDb(), {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  session: { strategy: "database" },
  providers: [Discord],
  callbacks: {
    /**
     * Exposes the authenticated user's id on the session so Server Actions
     * (ACM-018/019) can scope every query by `session.user.id`. This is the
     * app's only defense against IDOR since the schema does not enforce
     * ownership at the DB layer (see ACM-016 security audit).
     *
     * Only `id` is added — never spread `user` fields that could leak
     * OAuth-account data (refresh_token/access_token live on the `account`
     * row, never on `user`/`session`, and are never referenced here).
     */
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
