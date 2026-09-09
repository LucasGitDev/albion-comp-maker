import Link from "next/link";
import { redirect } from "next/navigation";

import { listMyCompsWithStatus } from "@/actions/comps";

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
    redirect("/");
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

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
          <p className="text-base font-medium text-foreground">Nenhuma comp ainda</p>
          <p className="max-w-sm text-sm text-foreground/60">
            Crie sua primeira comp para começar.
          </p>
          <Link
            href="/comp/new"
            className="mt-2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
          >
            Criar primeira comp
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(({ comp, isReachable, privateBuildCount }) => (
            <li key={comp.id}>
              <Link
                href={`/comps/${comp.id}`}
                className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 transition-colors hover:border-[var(--color-accent)] focus-visible:transition-none"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{comp.name}</span>
                  <span className="text-xs text-foreground/60">{comp.contentType || "Sem tipo"}</span>
                </div>
                <span
                  className={
                    !comp.isPublic
                      ? "rounded-full bg-[var(--color-icon-placeholder)] px-3 py-1 text-xs font-medium text-foreground/70"
                      : isReachable
                        ? "rounded-full bg-[var(--color-accent)]/15 px-3 py-1 text-xs font-medium text-[var(--color-accent)]"
                        : "rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-500"
                  }
                >
                  {!comp.isPublic
                    ? "Privada"
                    : isReachable
                      ? "Link público ativo"
                      : `Link público quebrado (${privateBuildCount})`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
