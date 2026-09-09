import Link from "next/link";

import { NewCompForm } from "@/components/comp/NewCompForm";

/**
 * `/comp/new` (ACM-097): a single-field form to create a comp. This is a
 * plain Server Component with no data to load — unlike `/builds` and
 * `/comps`, it does NOT call `auth()`/any owner-scoped action itself.
 * `src/proxy.ts` already guards this route (decision-016) as UX-only
 * gating, and the real authorization boundary is `createCompAction` ->
 * `createComp`, which calls `requireSession()` on its own (same
 * defense-in-depth rule as every other Server Action in this codebase).
 */
export default function NewCompPage(): React.JSX.Element {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8 outline-none">
      <Link href="/comps" className="text-sm text-foreground/60 hover:text-foreground">
        &lt; Minhas comps
      </Link>
      <h1 className="text-xl font-semibold text-foreground">Nova comp</h1>
      <NewCompForm />
    </main>
  );
}
