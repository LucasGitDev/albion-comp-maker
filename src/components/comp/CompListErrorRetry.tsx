"use client";

import { useRouter } from "next/navigation";

/**
 * Recoverable error state for the home dashboard's comp list (ACM-096
 * AC#5): `listMyCompsWithStatus()` failing must never silently redirect —
 * it shows this message with a "Tentar de novo" action that re-runs the
 * Server Component (via `router.refresh()`), not a full page navigation.
 */
export function CompListErrorRetry(): React.JSX.Element {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
      <p className="text-base font-medium text-foreground">Não foi possível carregar suas comps</p>
      <p className="max-w-sm text-sm text-foreground/60">Tente novamente em instantes.</p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="mt-2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
      >
        Tentar de novo
      </button>
    </div>
  );
}
