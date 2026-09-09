/**
 * Single source of truth for the locales the app supports (ACM-093 /
 * decision-026). Previously `SEARCHED_LOCALES` was declared identically in
 * both `src/lib/item-index.ts` and `src/components/item-picker/highlight.ts`
 * for file-scope reasons (ACM-028); the introduction of a real toggle
 * (ACM-093) makes that duplication an architectural liability instead of a
 * scoping convenience, so it's collapsed here.
 */
export const SUPPORTED_LOCALES = ["en-US", "pt-BR"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Default/fallback locale — also the tail of the resolveLocalizedName chain. */
export const DEFAULT_LOCALE: Locale = "en-US";

/** Cookie holding the user's locale preference (decision-026: cookie, not localStorage). */
export const LOCALE_COOKIE = "acm_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Validates an arbitrary (possibly attacker-controlled, since the cookie is
 * not HttpOnly) string against `SUPPORTED_LOCALES`, case-insensitively, and
 * falls back to `DEFAULT_LOCALE` on any mismatch. No consumer may trust the
 * raw cookie value directly — this is the single choke point that does.
 */
export function normalizeLocale(value: string | undefined | null): Locale {
  if (!value) return DEFAULT_LOCALE;
  const match = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === value.toLowerCase());
  return match ?? DEFAULT_LOCALE;
}

/** The other supported locale, used for cross-locale search/highlight fallbacks. */
export function otherLocaleOf(locale: Locale): Locale | undefined {
  return SUPPORTED_LOCALES.find((candidate) => candidate !== locale);
}
