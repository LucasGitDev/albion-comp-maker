import Link from "next/link";
import { redirect } from "next/navigation";

import { listMyBuilds } from "@/actions/builds";

/**
 * Lists the current user's builds (ACM-018). This is a plain `/builds`
 * route, not `/[locale]/builds` — locale-prefixed routing (ACM-023) will
 * relocate this page once it lands; see task implementation notes.
 *
 * `listMyBuilds` calls `requireSession()` itself, so this page never reads
 * `auth()`/cookies directly — `src/proxy.ts` redirecting unauthenticated
 * visitors is UX only, the Server Action call below is the real boundary.
 */
export default async function BuildsPage(): Promise<React.JSX.Element> {
  // `src/proxy.ts` already redirects unauthenticated visitors away from
  // `/builds/:path*` before this ever renders — this catch is a fallback
  // for the "not the sole boundary" case (e.g. proxy matcher drift), not
  // the primary defense. `listMyBuilds` is the real authorization check.
  let myBuilds: Awaited<ReturnType<typeof listMyBuilds>>;
  try {
    myBuilds = await listMyBuilds();
  } catch {
    redirect("/");
  }

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-8 outline-none">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">
          Minhas builds
        </h1>
        <Link
          href="/build/new"
          className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
        >
          Nova build
        </Link>
      </div>

      {myBuilds.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
          <p className="text-base font-medium text-foreground">
            Nenhuma build ainda
          </p>
          <p className="max-w-sm text-sm text-foreground/60">
            Crie sua primeira build para começar.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {myBuilds.map((build) => (
            <li key={build.id}>
              <Link
                href={`/builds/${build.id}`}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-colors hover:border-[var(--color-accent)] focus-visible:transition-none"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{build.name}</span>
                  <span className="text-xs text-foreground/60">
                    {build.role || "Sem papel"} · {build.isPublic ? "Pública" : "Privada"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
