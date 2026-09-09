import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for `/builds` (ACM-110 AC#4), shown while
 * `listMyBuilds()` awaits. Mirrors `BuildsListManager`'s list-item shape
 * (name + role/visibility line + action buttons) so there's no layout
 * shift when the real list mounts.
 */
export default function BuildsLoading(): React.JSX.Element {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-8 outline-none">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>

      <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando builds">
        {[0, 1, 2, 3].map((i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
