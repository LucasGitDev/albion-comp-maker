import type { AOItem } from "@/data/ao-data.d";

/**
 * Pure helpers to derive tier and enchant variants of an equipped item from
 * the ao-data catalogue. No DOM, no store — SlotCard/SlotGrid call these
 * with whatever `AOItem[]` catalogue the caller has loaded.
 *
 * Albion uniquenames encode tier and enchant directly:
 *   T4_HEAD_PLATE_SET1       (tier 4, enchant 0)
 *   T8_HEAD_PLATE_SET1@2     (tier 8, enchant 2)
 * "Same base ID" (ACM-009 AC #1) means the string with the leading `T<n>_`
 * and trailing `@<n>` stripped.
 */

export type TierOption = {
  tier: number; // 1..8
  itemId: string;
};

export type EnchantOption = {
  enchant: 0 | 1 | 2 | 3 | 4;
  itemId: string;
};

type ParsedUniquename = {
  tier: number; // 0 when the id has no T-prefix (not a tiered item)
  base: string;
  enchant: 0 | 1 | 2 | 3 | 4;
};

const TIER_PREFIX = /^T([1-8])_(.+)$/;
const ENCHANT_SUFFIX = /@([0-4])$/;

export function parseUniquename(uniquename: string): ParsedUniquename {
  const tierMatch = TIER_PREFIX.exec(uniquename);
  const tier = tierMatch ? Number(tierMatch[1]) : 0;
  const rest = tierMatch ? tierMatch[2] : uniquename;
  const enchantMatch = ENCHANT_SUFFIX.exec(rest);
  const enchant = (enchantMatch ? Number(enchantMatch[1]) : 0) as 0 | 1 | 2 | 3 | 4;
  const base = enchantMatch ? rest.slice(0, -enchantMatch[0].length) : rest;
  return { tier, base, enchant };
}

/**
 * Every tier (1..8) of the same base item as `currentUniquename`, one entry
 * per tier that exists in `items`. Prefers the variant at the current
 * enchant level; falls back to enchant 0 if that tier has no such enchant.
 */
export function getTierVariants(items: readonly AOItem[], currentUniquename: string): TierOption[] {
  const current = parseUniquename(currentUniquename);
  const byTier = new Map<number, { enchant0?: AOItem; matchingEnchant?: AOItem }>();

  for (const item of items) {
    const parsed = parseUniquename(item.uniquename);
    if (parsed.base !== current.base || parsed.tier === 0) continue;
    const entry = byTier.get(parsed.tier) ?? {};
    if (parsed.enchant === 0) entry.enchant0 = item;
    if (parsed.enchant === current.enchant) entry.matchingEnchant = item;
    byTier.set(parsed.tier, entry);
  }

  const options: TierOption[] = [];
  for (const tier of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const entry = byTier.get(tier);
    const item = entry?.matchingEnchant ?? entry?.enchant0;
    if (item) options.push({ tier, itemId: item.uniquename });
  }
  return options;
}

/**
 * Every enchant level (0..maxEnchant) available for the same base item and
 * tier as `currentUniquename` (AC #2 — never shows an enchant that has no
 * corresponding item in the catalogue).
 */
export function getEnchantOptions(items: readonly AOItem[], currentUniquename: string): EnchantOption[] {
  const current = parseUniquename(currentUniquename);
  const byEnchant = new Map<number, AOItem>();

  for (const item of items) {
    const parsed = parseUniquename(item.uniquename);
    if (parsed.base !== current.base || parsed.tier !== current.tier) continue;
    byEnchant.set(parsed.enchant, item);
  }

  const options: EnchantOption[] = [];
  for (const enchant of [0, 1, 2, 3, 4] as const) {
    const item = byEnchant.get(enchant);
    if (item) options.push({ enchant, itemId: item.uniquename });
  }
  return options;
}
