/**
 * Pure, DOM-free helpers for ItemPicker result-row display (ACM-028 /
 * doc-002 section 3.2). Deliberately duplicates the small tier/enchant
 * token regexes and locale list from src/lib/item-index.ts rather than
 * importing internals, to keep this task's file scope inside
 * src/components/item-picker/** (see ACM-008 review notes on tierOf()).
 */

const TIER_PATTERN = /^t([1-8])$/i;
const TIER_ENCHANT_PATTERN = /^([1-8])\.([0-4])$/;
const ENCHANT_PATTERN = /^[@.]([0-4])$/;

/** Locales always searched together, mirrors item-index.ts's SEARCHED_LOCALES. */
export const SEARCHED_LOCALES = ["en-US", "pt-BR"] as const;

export function otherLocaleOf(locale: string): string | undefined {
  return SEARCHED_LOCALES.find((candidate) => candidate !== locale);
}

/**
 * Splits a raw query into its text tokens, dropping tier/enchant filter
 * tokens (`t8`, `8.3`, `.3`, `@3`) — those are not substrings to highlight.
 */
export function extractTextTokens(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (token) =>
        !TIER_PATTERN.test(token) &&
        !TIER_ENCHANT_PATTERN.test(token) &&
        !ENCHANT_PATTERN.test(token)
    );
}

/**
 * Strips diacritics and lowercases without collapsing whitespace, so the
 * result stays character-index-aligned with the input for substring
 * highlighting (unlike src/lib/item-index.ts's normalize(), which also
 * collapses whitespace for indexing purposes).
 */
function normalizeSameLength(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export type MarkRange = { start: number; end: number };

/**
 * First occurrence of each token in `name`, diacritic/case-insensitive.
 * No regex is built from the query, so regex-special characters in a
 * typed token (e.g. `.`, `(`, `*`) can never throw or behave unexpectedly.
 * Overlapping/adjacent ranges are merged.
 */
export function findMatchRanges(name: string, tokens: string[]): MarkRange[] {
  const normalizedName = normalizeSameLength(name);
  const ranges: MarkRange[] = [];

  for (const rawToken of tokens) {
    const token = normalizeSameLength(rawToken);
    if (!token) continue;
    const start = normalizedName.indexOf(token);
    if (start === -1) continue;
    ranges.push({ start, end: start + token.length });
  }

  ranges.sort((a, b) => a.start - b.start);

  const merged: MarkRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

export type NameSegment = { text: string; marked: boolean };

/** Splits `name` into marked/unmarked segments per `findMatchRanges` output. */
export function segmentName(name: string, ranges: MarkRange[]): NameSegment[] {
  if (ranges.length === 0) return [{ text: name, marked: false }];

  const segments: NameSegment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start > cursor) segments.push({ text: name.slice(cursor, range.start), marked: false });
    segments.push({ text: name.slice(range.start, range.end), marked: true });
    cursor = range.end;
  }
  if (cursor < name.length) segments.push({ text: name.slice(cursor), marked: false });
  return segments;
}

/**
 * True when at least one text token matches `otherName` but none match
 * `activeName` — i.e. the row is only in the result set because of its
 * non-active-locale name (doc-002 section 3.2 secondary name display).
 */
export function matchesOnlyOtherLocale(
  activeName: string | undefined,
  otherName: string | undefined,
  tokens: string[]
): boolean {
  if (tokens.length === 0 || !otherName) return false;

  const normalizedActive = activeName ? normalizeSameLength(activeName) : "";
  const normalizedOther = normalizeSameLength(otherName);
  const normalizedTokens = tokens.map((token) => normalizeSameLength(token)).filter(Boolean);
  if (normalizedTokens.length === 0) return false;

  const matchesActive = normalizedTokens.some((token) => normalizedActive.includes(token));
  if (matchesActive) return false;

  return normalizedTokens.some((token) => normalizedOther.includes(token));
}
