"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { LocaleToggle } from "@/components/i18n/LocaleToggle";
import { t } from "@/lib/i18n/messages";

type AccountState =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "authenticated"; label: string };

/**
 * Reads `/api/auth/[...nextauth]`'s own session endpoint directly instead of
 * `next-auth/react`'s `useSession()`, which throws unless the tree is
 * wrapped in a `<SessionProvider>` (ACM-037: no provider is introduced —
 * Header and `EditorActionBar` each resolve auth state independently, and
 * D3 only requires the *save* action to gate on click, not the header to
 * pre-authenticate on every route).
 */
function useAccountState(fallbackLabel: string): AccountState {
  const [state, setState] = useState<AccountState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: { name?: string | null; email?: string | null } } | null) => {
        if (cancelled) return;
        if (data?.user) {
          setState({ kind: "authenticated", label: data.user.name ?? data.user.email ?? fallbackLabel });
        } else {
          setState({ kind: "unauthenticated" });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "unauthenticated" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fallbackLabel only affects a rare fallback and re-running the fetch on locale change would be wasteful; the label is re-derived from the current locale on the next fetch anyway.
  }, []);

  return state;
}

export function Header(): React.JSX.Element {
  const pathname = usePathname();
  const isEditorRoute = pathname?.startsWith("/build") ?? false;
  const locale = useLocale();
  const account = useAccountState(t(locale, "account.fallbackLabel"));
  const navLinks: ReadonlyArray<{ href: string; label: string }> = [
    { href: "/", label: t(locale, "nav.myComps") },
  ];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mobileNavPanelRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        mobileNavTriggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (mobileNavPanelRef.current?.contains(target)) return;
      if (mobileNavTriggerRef.current?.contains(target)) return;
      setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [mobileNavOpen]);

  return (
    <header
      className={[
        "z-30 flex h-[var(--header-h-sm)] items-center justify-between gap-4 border-b bg-[var(--color-surface)] px-4 md:h-[var(--header-h)] md:px-6",
        isEditorRoute ? "md:sticky md:top-0" : "sticky top-0",
        scrolled
          ? "border-transparent shadow-[0_1px_0_0_var(--color-border),0_8px_24px_-12px_#000000]"
          : "border-[var(--color-border)]",
      ].join(" ")}
    >
      <Link
        href="/"
        className="shrink-0 text-base font-semibold tracking-tight text-foreground focus-visible:transition-none"
        aria-label="Albion Comp Maker — página inicial"
      >
        <span className="sm:hidden" aria-hidden="true">
          ACM
        </span>
        <span className="hidden sm:inline">Albion Comp Maker</span>
      </Link>

      <nav aria-label="Principal" className="hidden items-center gap-6 text-sm md:flex">
        {navLinks.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={[
                "transition-colors hover:text-foreground focus-visible:transition-none",
                active ? "text-foreground" : "text-foreground/70",
              ].join(" ")}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <div className="hidden md:block">
          <LocaleToggle />
        </div>
        {isEditorRoute ? (
          <div className="flex h-9 w-24 items-center justify-end" data-testid="header-account-slot">
            {account.kind === "loading" && (
              <span aria-hidden="true" className="h-4 w-16 rounded bg-[var(--color-icon-placeholder)]" />
            )}
            {account.kind === "unauthenticated" && (
              // eslint-disable-next-line @next/next/no-html-link-for-pages -- /api/auth/signin is a NextAuth route handler, not an app-router page.
              <a
                href="/api/auth/signin"
                className="text-sm text-foreground/70 transition-colors hover:text-foreground focus-visible:transition-none"
              >
                {t(locale, "account.signIn")}
              </a>
            )}
            {account.kind === "authenticated" && (
              <span className="truncate text-sm text-foreground/70" title={account.label}>
                {account.label}
              </span>
            )}
          </div>
        ) : (
          <Link
            href="/build/new"
            className="hidden rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none md:inline-block"
          >
            {t(locale, "account.newBuild")}
          </Link>
        )}

        {!isEditorRoute && (
          <Link
            href="/build/new"
            aria-label={t(locale, "account.newBuildAriaLabel")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent)] text-lg font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none md:hidden"
          >
            +
          </Link>
        )}

        <div className="md:hidden">
          <LocaleToggle />
        </div>

        {/*
          The mobile disclosure only earns its place once there's a route
          beyond Home to navigate to (doc-004 §4: "não abrir painel vazio").
          `/builds` doesn't exist yet (§1.1), so `navLinks` has exactly one
          entry today and the trigger stays hidden.
        */}
        {navLinks.length > 1 && (
          <div className="relative md:hidden">
            <button
              ref={mobileNavTriggerRef}
              type="button"
              aria-expanded={mobileNavOpen}
              aria-haspopup="true"
              aria-label={t(locale, "account.openNav")}
              onClick={() => setMobileNavOpen((open) => !open)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-foreground/70 transition-colors hover:text-foreground focus-visible:transition-none"
            >
              ⋮
            </button>
            {mobileNavOpen && (
              <div
                ref={mobileNavPanelRef}
                role="menu"
                className="absolute right-0 top-full z-40 mt-2 min-w-40 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-[0_8px_24px_-12px_#000000]"
              >
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    onClick={() => setMobileNavOpen(false)}
                    className="block px-4 py-2 text-sm text-foreground/80 transition-colors hover:text-foreground focus-visible:transition-none"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
