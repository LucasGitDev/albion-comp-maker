import type { AOItem, Slot } from "@/data/ao-data.d";

/**
 * Pure, DOM-free search index over the item catalogue. See doc-002
 * ("ItemPicker autocomplete with slot filter spec", section 1-2) for the
 * behaviour this implements.
 */

const TIER_PATTERN = /^t([1-8])$/i;
const TIER_ENCHANT_PATTERN = /^([1-8])\.([0-4])$/;
const ENCHANT_PATTERN = /^[@.]([0-4])$/;

/** Locales always searched together, regardless of active UI language. */
const SEARCHED_LOCALES = ["en-US", "pt-BR"] as const;

export type IndexedItem = {
  item: AOItem;
  tier: number; // 1..8, 0 when the id has no T-prefix
  enchant: number; // 0..4 from "@n"
  names: Record<string, string>; // locale -> normalized name
  idNorm: string; // uniquename lowercased and normalized
};

export type ItemIndex = {
  bySlot: Map<Slot, IndexedItem[]>;
  all: IndexedItem[];
};

export type SearchOptions = {
  slot?: Slot;
  locale: string;
  limit?: number;
};

const DEFAULT_LIMIT = 200;

/** Strips diacritics, lowercases and collapses whitespace. */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function extractTier(uniquename: string): number {
  const match = /^T([1-8])_/.exec(uniquename);
  return match ? Number(match[1]) : 0;
}

function extractEnchant(uniquename: string): number {
  const match = /@([0-4])$/.exec(uniquename);
  return match ? Number(match[1]) : 0;
}

function buildIndexedItem(item: AOItem): IndexedItem {
  const names: Record<string, string> = {};
  for (const locale of SEARCHED_LOCALES) {
    const raw = item.localizedNames?.[locale];
    if (raw) names[locale] = normalize(raw);
  }
  return {
    item,
    tier: extractTier(item.uniquename),
    enchant: extractEnchant(item.uniquename),
    names,
    idNorm: normalize(item.uniquename),
  };
}

/**
 * Builds the search index once. Callers (e.g. the `useItemIndex` React hook)
 * are responsible for memoizing this across renders — building 2000+ entries
 * per keystroke would defeat the point of the index.
 */
export function buildItemIndex(items: AOItem[]): ItemIndex {
  const bySlot = new Map<Slot, IndexedItem[]>();
  const all: IndexedItem[] = [];

  for (const item of items) {
    const indexed = buildIndexedItem(item);
    all.push(indexed);
    const bucket = bySlot.get(item.slot);
    if (bucket) bucket.push(indexed);
    else bySlot.set(item.slot, [indexed]);
  }

  return { bySlot, all };
}

type TierFilter = { tier?: number; enchant?: number };

function classifyToken(token: string): { filter?: TierFilter; text?: string } {
  const tierMatch = TIER_PATTERN.exec(token);
  if (tierMatch) return { filter: { tier: Number(tierMatch[1]) } };

  const tierEnchantMatch = TIER_ENCHANT_PATTERN.exec(token);
  if (tierEnchantMatch) {
    return {
      filter: {
        tier: Number(tierEnchantMatch[1]),
        enchant: Number(tierEnchantMatch[2]),
      },
    };
  }

  const enchantMatch = ENCHANT_PATTERN.exec(token);
  if (enchantMatch) return { filter: { enchant: Number(enchantMatch[1]) } };

  return { text: token };
}

type ParsedQuery = {
  tier?: number;
  enchant?: number;
  textTokens: string[];
};

function parseQuery(query: string): ParsedQuery {
  const tokens = normalize(query).split(" ").filter(Boolean);
  const result: ParsedQuery = { textTokens: [] };
  for (const token of tokens) {
    const classified = classifyToken(token);
    if (classified.filter) {
      if (classified.filter.tier !== undefined) result.tier = classified.filter.tier;
      if (classified.filter.enchant !== undefined) result.enchant = classified.filter.enchant;
    } else if (classified.text) {
      result.textTokens.push(classified.text);
    }
  }
  return result;
}

/** Score of a single text token against an indexed item. Lower wins. Returns null on no match. */
function scoreToken(
  token: string,
  entry: IndexedItem,
  activeLocale: string
): number | null {
  const activeName = entry.names[activeLocale];
  const otherLocale = SEARCHED_LOCALES.find((locale) => locale !== activeLocale);
  const otherName = otherLocale ? entry.names[otherLocale] : undefined;

  if (activeName === token) return 0;
  if (activeName?.startsWith(token)) return 10;
  if (activeName && wordStartsWith(activeName, token)) return 20;
  if (otherName?.startsWith(token)) return 30;
  if (otherName && wordStartsWith(otherName, token)) return 40;
  if ((activeName && activeName.includes(token)) || (otherName && otherName.includes(token))) {
    return 50;
  }
  if (entry.idNorm.includes(token)) return 60;
  return null;
}

function wordStartsWith(haystack: string, token: string): boolean {
  return haystack.split(" ").some((word) => word.startsWith(token));
}

/**
 * Pure function over a prebuilt index. Deliberately not a hook so it can be
 * benched/tested without a DOM (AC #1).
 */
export function searchItems(index: ItemIndex, query: string, options: SearchOptions): AOItem[] {
  const { slot, locale, limit = DEFAULT_LIMIT } = options;
  const candidates = slot ? index.bySlot.get(slot) ?? [] : index.all;
  const parsed = parseQuery(query);

  const scored: Array<{ entry: IndexedItem; score: number }> = [];

  for (const entry of candidates) {
    if (parsed.tier !== undefined && entry.tier !== parsed.tier) continue;
    if (parsed.enchant !== undefined && entry.enchant !== parsed.enchant) continue;

    if (parsed.textTokens.length === 0) {
      scored.push({ entry, score: 0 });
      continue;
    }

    let matched = true;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < parsed.textTokens.length; i++) {
      const token = parsed.textTokens[i];
      const tokenScore = scoreToken(token, entry, locale);
      if (tokenScore === null) {
        matched = false;
        break;
      }
      if (i === 0) bestScore = tokenScore;
    }
    if (!matched) continue;
    scored.push({ entry, score: bestScore });
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.entry.tier !== b.entry.tier) return b.entry.tier - a.entry.tier;
    if (a.entry.enchant !== b.entry.enchant) return b.entry.enchant - a.entry.enchant;
    const aName = a.entry.names[locale] ?? a.entry.idNorm;
    const bName = b.entry.names[locale] ?? b.entry.idNorm;
    return aName.localeCompare(bName);
  });

  return scored.slice(0, limit).map((s) => s.entry.item);
}
