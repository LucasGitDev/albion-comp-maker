import type { AOItem } from "@/data/ao-data.d";

/**
 * Pure helpers to derive tier variants of an equipped item from the ao-data
 * catalogue. No DOM, no store — SlotCard/SlotGrid call these with whatever
 * `AOItem[]` catalogue the caller has loaded.
 *
 * Albion uniquenames encode tier directly:
 *   T4_HEAD_PLATE_SET1       (tier 4)
 *   T8_HEAD_PLATE_SET1       (tier 8)
 * "Same base ID" (ACM-009 AC #1) means the string with the leading `T<n>_`
 * prefix stripped.
 *
 * Enchant is NOT part of the uniquename in real ao-bin-dumps data (verified
 * against the 2036-item fixture corpus and live upstream items.json — see
 * decision-011). It is a nested `enchantments.enchantment` array on the base
 * item record. Deriving an enchant selector correctly requires
 * `AOItem.maxEnchant`, which ACM-030 will add to the pipeline; until then
 * enchant selection is out of scope here.
 */

export type TierOption = {
  tier: number; // 1..8
  itemId: string;
};

type ParsedUniquename = {
  tier: number; // 0 when the id has no T-prefix (not a tiered item)
  base: string;
};

const TIER_PREFIX = /^T([1-8])_(.+)$/;

export function parseUniquename(uniquename: string): ParsedUniquename {
  const tierMatch = TIER_PREFIX.exec(uniquename);
  const tier = tierMatch ? Number(tierMatch[1]) : 0;
  const base = tierMatch ? tierMatch[2] : uniquename;
  return { tier, base };
}

/**
 * Every tier (1..8) of the same base item as `currentUniquename`, one entry
 * per tier that exists in `items`.
 */
export function getTierVariants(items: readonly AOItem[], currentUniquename: string): TierOption[] {
  const current = parseUniquename(currentUniquename);
  const byTier = new Map<number, AOItem>();

  for (const item of items) {
    const parsed = parseUniquename(item.uniquename);
    if (parsed.base !== current.base || parsed.tier === 0) continue;
    byTier.set(parsed.tier, item);
  }

  const options: TierOption[] = [];
  for (const tier of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const item = byTier.get(tier);
    if (item) options.push({ tier, itemId: item.uniquename });
  }
  return options;
}
