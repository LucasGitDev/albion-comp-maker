import Link from "next/link";

import { listMyCompsWithStatus } from "@/actions/comps";
import { CompListErrorRetry } from "@/components/comp/CompListErrorRetry";
import { CompsListManager } from "@/components/comp/CompsListManager";

/**
 * Lists the current user's comps with a share-status badge (ACM-066). Mirrors
 * `src/app/builds/page.tsx`: `listMyCompsWithStatus` calls `requireSession()`
 * itself, so this page never reads `auth()`/cookies directly — `src/proxy.ts`
 * redirecting unauthenticated visitors is UX only, the Server Action call
 * below is the real boundary.
 */
export default async function CompsPage(): Promise<React.JSX.Element> {
  let items: Awaited<ReturnType<typeof listMyCompsWithStatus>>;
  try {
    items = await listMyCompsWithStatus();
  } catch {
    return (
      <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-4xl flex-1 flex-col p-8 outline-none">
        <CompListErrorRetry />
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-8 outline-none">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Minhas comps</h1>
        <Link
          href="/comp/new"
          className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
        >
          Nova comp
        </Link>
      </div>

      <CompsListManager
        initialComps={items.map(({ comp, isReachable, privateBuildCount }) => ({
          id: comp.id,
          name: comp.name,
          contentType: comp.contentType,
          isPublic: comp.isPublic,
          isReachable,
          privateBuildCount,
        }))}
      />
    </main>
  );
}
