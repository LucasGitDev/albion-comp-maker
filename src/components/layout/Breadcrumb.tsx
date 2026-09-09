import Link from "next/link";

export type BreadcrumbProps = {
  /** Current step label, e.g. "Nova build" or a saved build's name. */
  current: string;
  /**
   * When the build being edited belongs to a comp, renders the extra
   * comp -> build hop between "Minhas comps" and `current` (ACM-100 AC#5),
   * e.g. "Minhas comps / ZvZ Terça / Tank principal". `href` points back to
   * that comp's own management page (`/comps/[id]`).
   */
  comp?: { name: string; href: string };
};

/**
 * Breadcrumb for the editor (AC#3 / doc-004 §3.1). "Minhas comps" is a real
 * `<Link href="/">`, never `router.back()` — `history.back()` is unreliable
 * when the user arrived via a direct link or a refresh, and AC#3 explicitly
 * requires a way back that doesn't depend on browser history. The optional
 * `comp` hop follows the same rule: a real `<Link>`, not history navigation.
 */
export function Breadcrumb({ current, comp }: BreadcrumbProps): React.JSX.Element {
  return (
    <nav aria-label="Trilha" className="text-sm">
      <ol className="flex items-center gap-2">
        <li>
          <Link
            href="/"
            className="text-foreground/70 transition-colors hover:text-foreground focus-visible:transition-none"
          >
            ← Minhas comps
          </Link>
        </li>
        {comp && (
          <>
            <li aria-hidden="true" className="hidden text-foreground/40 sm:inline">
              ›
            </li>
            <li className="hidden max-w-[24ch] truncate sm:inline">
              <Link
                href={comp.href}
                className="text-foreground/70 transition-colors hover:text-foreground focus-visible:transition-none"
                title={comp.name}
              >
                {comp.name}
              </Link>
            </li>
          </>
        )}
        <li aria-hidden="true" className="hidden text-foreground/40 sm:inline">
          ›
        </li>
        <li aria-current="page" className="hidden max-w-[24ch] truncate text-foreground sm:inline" title={current}>
          {current}
        </li>
      </ol>
    </nav>
  );
}
