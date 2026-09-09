/**
 * Route-level loading fallback for `/` (ACM-096 AC obrigatório: skeleton de
 * 3 cards while `Home` resolves `auth()`/`listMyCompsWithStatus()`). Next.js
 * renders this automatically while the async Server Component in
 * `page.tsx` is still pending — no client-side fetch/loading state needed.
 */
export default function Loading(): React.JSX.Element {
  return (
    <main className="flex flex-1 flex-col gap-4 px-6 py-12" aria-busy="true" aria-label="Carregando">
      <div className="h-6 w-32 animate-pulse rounded bg-[var(--color-icon-placeholder)]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </main>
  );
}
