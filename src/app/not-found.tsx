import Link from "next/link";

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

/**
 * Root 404 (ACM-110 AC#1). Several routes (`/comp/[slug]`, `/build/[id]`,
 * `/builds/[id]`, `/comps/[id]`, `/(editor)/build/[id]/edit`) call
 * `notFound()` on a missing/unauthorized resource — before this file
 * existed, that rendered Next.js's unstyled default 404 with no way back,
 * a dead end for links shared on Discord.
 */
export default function NotFound(): React.JSX.Element {
  return (
    <main id="main-content" tabIndex={-1} className="flex flex-1 items-center justify-center p-8 outline-none">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Página não encontrada</EmptyTitle>
          <EmptyDescription>
            O link que você acessou não existe ou não está mais disponível.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href="/"
            className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
          >
            Voltar para o início
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}
