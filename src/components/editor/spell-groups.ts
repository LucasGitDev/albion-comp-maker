import type { AOItem, AOItemSpell } from "@/data/ao-data";
import type { SpellGroup } from "@/types/build";

/** Q/W/E map to an item's own `slotGroup` ("1"/"2"/"3"); passives/toggles collect into a single group regardless of slotGroup. */
const ACTIVE_SLOT_GROUP_TO_SPELL_GROUP: Record<string, SpellGroup> = {
  "1": "q",
  "2": "w",
  "3": "e",
};

export type SpellCandidate = {
  uniquename: string;
  /** Human-readable name resolved for `locale`, falling back to the uniquename. */
  name: string;
};

/**
 * Groups an item's resolved spells (`AOItem.spells`) into the four picker
 * rows (Q/W/E/Passive). This is the sole source of truth for which chips a
 * slot can ever offer — never a hardcoded or guessed list (the product's
 * whole differentiator). A group with no candidates is omitted from the
 * returned record entirely, so callers can render "no row" by checking key
 * presence.
 *
 * - Active/toggle spells: bucketed by the item's own `slotGroup` ("1"→Q,
 *   "2"→W, "3"→E). Slot groups beyond "3" have no Q/W/E/Passive home in this
 *   product's UI and are dropped (no known real item exceeds 3 actives).
 * - Passive spells: all collected into a single "passive" group regardless
 *   of `slotGroup" (real items can list several candidate passives for the
 *   same effective slot, e.g. toggled variants).
 */
export function groupItemSpells(
  spells: readonly AOItemSpell[],
  locale: string
): Partial<Record<SpellGroup, SpellCandidate[]>> {
  const groups: Partial<Record<SpellGroup, SpellCandidate[]>> = {};

  const seen = new Set<string>();
  for (const spell of spells) {
    const group: SpellGroup | undefined =
      spell.kind === "passive"
        ? "passive"
        : ACTIVE_SLOT_GROUP_TO_SPELL_GROUP[spell.slotGroup];
    if (!group) continue;

    // The resolver can accumulate the same spell more than once across the
    // inheritance chain; de-dupe per group so a chip never repeats.
    const dedupeKey = `${group}:${spell.uniquename}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const candidate: SpellCandidate = {
      uniquename: spell.uniquename,
      name: spell.localizedNames[locale] ?? spell.uniquename,
    };
    (groups[group] ??= []).push(candidate);
  }

  return groups;
}

/** Convenience wrapper reading straight off an `AOItem`. */
export function groupSpellsForItem(
  item: Pick<AOItem, "spells">,
  locale: string
): Partial<Record<SpellGroup, SpellCandidate[]>> {
  return groupItemSpells(item.spells, locale);
}
