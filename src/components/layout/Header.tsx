import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4">
      <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
        Albion Comp Maker
      </Link>
      <nav className="flex items-center gap-6 text-sm text-foreground/80">
        <Link href="/" className="transition-colors hover:text-foreground">
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
