import "server-only";

import { cookies } from "next/headers";

import { LOCALE_COOKIE, normalizeLocale, type Locale } from "@/lib/i18n/locales";

/**
 * Reads the active locale from the `acm_locale` cookie (decision-026),
 * validated through `normalizeLocale` — the cookie is not `HttpOnly`, so
 * its raw value must never be trusted directly. Used by `RootLayout` and
 * every public SSR page (`/build/[slug]`, `/comp/[slug]`) that needs to
 * resolve item/spell names server-side.
 */
export async function getRequestLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}
