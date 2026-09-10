import Link from "next/link";
import { Suspense } from "react";

import { listMyCompsWithStatus } from "@/actions/comps";
import { auth } from "@/auth/config";
import { CompCard } from "@/components/comp/CompCard";
import { CompListErrorRetry } from "@/components/comp/CompListErrorRetry";
import { CompListSkeleton } from "@/components/comp/CompListSkeleton";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import { getRequestLocale } from "@/lib/i18n/server-locale";
import { t } from "@/lib/i18n/messages";

/**
 * `/` splits by session (ACM-096): no session renders the landing hero with
 * "Entrar com Discord" as the primary action; an authenticated session
 * renders the "Minhas comps" dashboard instead, fetched via
 * `listMyCompsWithStatus()` (same Server Action `/comps` already uses —
 * reused here instead of `listMyComps()` because the dashboard cards need
 * the build count and public/private badge that only the `WithStatus`
 * variant computes). `auth()` is read directly (not just relying on
 * `src/proxy.ts`) because the two states render entirely different markup,
 * not just a redirect.
 *
 * The list is fetched inside `<CompsList>`, an async Server Component
 * wrapped in a local `<Suspense>` — instead of an `app/loading.tsx` file. A
 * root `loading.tsx` is the Suspense boundary for the *entire* `src/app`
 * subtree (Next.js App Router), so it would leak this comp-card skeleton
 * into every other route's navigation (e.g. `/build/new`, `/builds`,
 * `/comps`) that doesn't define its own `loading.tsx`. Scoping the fallback
 * to this component keeps the skeleton on `/` only, and also lets the page
 * shell (title, CTAs) paint immediately while just the list suspends —
 * Next.js streams `<CompsList>`'s resolved markup in once
 * `listMyCompsWithStatus()` settles. `<CompsList>` is exported so
 * `home-page.test.tsx` can await and assert on its resolved output
 * directly: plain `react-dom` (used by `@testing-library/react` outside of
 * Next.js's RSC runtime) cannot execute an async component through
 * `<Suspense>` the way Next.js's streaming renderer does.
 */
export default async function Home(): Promise<React.JSX.Element> {
  const session = await auth();
  const locale = await getRequestLocale();

  if (!session?.user?.id) {
    return (
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <section className="flex flex-col items-center gap-4 border-b border-[var(--color-border)] px-6 pt-24 pb-32 text-center">
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t(locale, "home.heroTitle")}
          </h1>
          <p className="max-w-xl text-base text-foreground/70">{t(locale, "home.heroSubtitle")}</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /api/auth/signin is a NextAuth route handler, not an app-router page (same rationale as Header.tsx). */}
          <a
            href="/api/auth/signin"
            className="mt-2 bg-[var(--color-accent)] px-6 py-3 font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
          >
            {t(locale, "home.signInWithDiscord")}
          </a>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
      <section className="flex flex-1 flex-col gap-4 px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-foreground">{t(locale, "home.myComps")}</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/build/new"
              className="text-sm text-foreground/70 transition-colors hover:text-foreground focus-visible:transition-none"
            >
              {t(locale, "home.newBuild")}
            </Link>
            <Link
              href="/comp/new"
              className="bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
            >
              {t(locale, "home.newComp")}
            </Link>
          </div>
        </div>

        <Suspense fallback={<CompListSkeleton />}>
          <CompsList locale={locale} />
        </Suspense>
      </section>
    </main>
  );
}

export async function CompsList({ locale = DEFAULT_LOCALE }: { locale?: Locale } = {}): Promise<React.JSX.Element> {
  let items: Awaited<ReturnType<typeof listMyCompsWithStatus>>;
  try {
    items = await listMyCompsWithStatus();
  } catch {
    return <CompListErrorRetry />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] py-16 text-center">
        <p className="text-base font-medium text-foreground">{t(locale, "home.emptyTitle")}</p>
        <p className="max-w-sm text-sm text-foreground/60">{t(locale, "home.emptySubtitle")}</p>
        <Link
          href="/comp/new"
          className="mt-2 bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
        >
          {t(locale, "home.emptyCta")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ comp, buildCount }) => (
        <CompCard
          key={comp.id}
          id={comp.id}
          name={comp.name}
          buildCount={buildCount}
          isPublic={comp.isPublic}
          updatedAt={comp.updatedAt}
        />
      ))}
    </div>
  );
}
