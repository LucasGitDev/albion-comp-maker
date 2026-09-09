import { FALLBACK_NAME_LOCALE, type Locale } from "@/lib/i18n/locales";

/**
 * Case-insensitive lookup into a `localizedNames`-shaped record.
 *
 * The real `ao-data.json` artifact emits locale keys in the CDN's own
 * casing (`"EN-US"`, `"PT-BR"`), while the rest of the app conventionally
 * writes locale strings lowercase (`"en-US"`). A plain `names[locale]`
 * lookup silently misses every real record and falls back to the raw
 * uniquename — this happened in production (ACM-040 review round 2)
 * precisely because a test fixture used the wrong casing and the exact-key
 * lookup agreed with it. Normalizing the comparison here makes every
 * consumer robust to either casing without needing to know which one the
 * artifact currently uses.
 */
export function pickLocalizedName(
  names: Record<string, string> | undefined,
  locale: string
): string | undefined {
  if (!names) return undefined;
  if (names[locale] !== undefined) return names[locale];

  const target = locale.toLowerCase();
  for (const key of Object.keys(names)) {
    if (key.toLowerCase() === target) return names[key];
  }
  return undefined;
}

/**
 * Centralized fallback chain (ACM-093 / decision-026): requested locale ->
 * `FALLBACK_NAME_LOCALE` (always `"en-US"`, independent of the UI's
 * `DEFAULT_LOCALE`) -> `undefined` (never the uniquename — callers own that
 * last step, since a spell's "no name at all" case and an item's are
 * handled slightly differently in a couple of call sites).
 *
 * Real gaps exist in the catalogue (e.g. the spell `PASSIVE_AA_STACK` only
 * has an `EN-US` name), so this fallback is load-bearing, not defensive.
 */
export function resolveLocalizedName(
  names: Record<string, string> | undefined,
  locale: Locale
): string | undefined {
  const direct = pickLocalizedName(names, locale);
  if (direct !== undefined) return direct;
  if (locale === FALLBACK_NAME_LOCALE) return undefined;
  return pickLocalizedName(names, FALLBACK_NAME_LOCALE);
}
