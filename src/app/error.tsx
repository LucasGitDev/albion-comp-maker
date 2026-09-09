"use client";

import Link from "next/link";
import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Route-level error boundary (ACM-110 AC#2). Next.js requires this to be a
 * Client Component with a default export receiving `{ error, reset }`.
 * Without it, any uncaught throw during render anywhere under `src/app/`
 * fell through to a blank white screen with no recovery path.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps): React.JSX.Element {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center outline-none">
      <p className="text-base font-medium text-foreground">Algo deu errado</p>
      <p className="max-w-sm text-sm text-foreground/60">{error.message || "Erro inesperado."}</p>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
        >
          Tentar de novo
        </button>
        <Link
          href="/"
          className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[var(--color-accent)] focus-visible:transition-none"
        >
          Voltar para o início
        </Link>
      </div>
    </main>
  );
}
