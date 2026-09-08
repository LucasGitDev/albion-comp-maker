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
