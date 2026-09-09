import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for `/comps/[id]` (ACM-110 AC#5), shown while the page's
 * `Promise.all` of `getCompPublishState`/`getComp`/`listCompBuildsDetailed`/
 * `listMyBuilds` resolves. Mirrors the page's title + builds manager +
 * share-status sections.
 */
export default function CompDetailLoading(): React.JSX.Element {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8 outline-none">
      <Skeleton className="h-7 w-2/3" />

      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Carregando comp">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
          >
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </main>
  );
}
