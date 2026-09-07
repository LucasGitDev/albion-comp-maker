import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
      <Link href="/" className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
        Albion Comp Maker
      </Link>
      <nav className="flex items-center gap-6 text-sm text-foreground/80">
        <Link href="/" className="hidden transition-colors hover:text-foreground sm:inline-block">
          Minhas comps
        </Link>
        <Link
          href="/build/new"
          className="rounded-full bg-[var(--color-accent)] px-4 py-2 font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          Nova build
        </Link>
      </nav>
    </header>
  );
}
