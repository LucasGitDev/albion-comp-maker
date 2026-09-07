import { auth } from "@/auth/config";

/**
 * Guard for Server Actions touching builds/comps: throws when there is no
 * authenticated session, otherwise returns it with `session.user.id`
 * populated. `session.user.id` is the only trusted actor id downstream
 * mutations (ACM-018/019) should use to scope queries by ownership.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}
