/**
 * Skeleton shown while `Home`'s `<CompsList>` suspends fetching
 * `listMyCompsWithStatus()` (ACM-096 AC: skeleton of 3 cards). Rendered as
 * the `fallback` of a `<Suspense>` boundary scoped to the home page's list
 * section only — not a root `app/loading.tsx` (that would leak into every
 * other route's navigation, see ACM-096 implementation notes).
 */
export function CompListSkeleton(): React.JSX.Element {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Carregando"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex h-28 flex-col gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--color-icon-placeholder)]" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-[var(--color-icon-placeholder)]" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--color-icon-placeholder)]" />
        </div>
      ))}
    </div>
  );
}
