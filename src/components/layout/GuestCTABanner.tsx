import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { getRequestLocale } from "@/lib/i18n/server-locale";
import { t } from "@/lib/i18n/messages";

type GuestCTABannerProps = {
  callbackPath: string;
};

/**
 * Sticky conversion CTA for anonymous visitors on public `/build/[id]` and
 * `/comp/[slug]` pages (ACM-117) — the highest-intent, highest-traffic
 * moment in the funnel (Discord share link), which previously had no path
 * back into the product besides the generic header sign-in link.
 *
 * Server component: reads the session directly via `auth()` instead of
 * `Header`'s client-side `/api/auth/session` fetch, since this banner has
 * no other reason to ship client JS and SSR avoids a layout-shifting
 * loading state for the very first thing a new visitor sees.
 *
 * `callbackPath` is passed in by the caller (derived from the already-known
 * route params) rather than read from `headers()` here, so this stays a
 * plain server component with no request-header coupling.
 */
export async function GuestCTABanner({ callbackPath }: GuestCTABannerProps): Promise<React.JSX.Element | null> {
  const session = await auth();
  if (session?.user?.id) {
    return null;
  }

  const locale = await getRequestLocale();
  const signInHref = `/api/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-3 border-t border-border bg-accent px-4 py-3 text-accent-foreground">
      <span className="text-sm font-medium">{t(locale, "guestCta.message")}</span>
      <Button render={<a href={signInHref} />}>{t(locale, "guestCta.signIn")}</Button>
    </div>
  );
}
