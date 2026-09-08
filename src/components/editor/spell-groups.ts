import type { AOItem, AOItemSpell } from "@/data/ao-data";
import type { SpellGroup } from "@/types/build";
import { pickLocalizedName } from "@/lib/localized-name";

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
      name: pickLocalizedName(spell.localizedNames, locale) ?? spell.uniquename,
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

/**
 * Groups this auto-selection applies to (ACM-089). Scoped to `e` only —
 * see the doc comment on `computeAutoSelections` for why.
 */
const AUTO_SELECT_GROUPS: readonly SpellGroup[] = ["e"];

/**
 * Computes which spell groups should be auto-filled because the equipped
 * item exposes exactly one candidate for that group (ACM-089 AC #1-#3).
 *
 * Deliberately scoped to the `e` group only, not applied generally to every
 * group with a single candidate. Two reasons:
 * 1. Product intent: the task/AC is specifically about a weapon's E — real
 *    weapon data always has multiple Q/W ability choices; E is the one slot
 *    that is genuinely always a single, non-choice.
 * 2. A general single-candidate rule would also auto-fill Q/W whenever a
 *    (possibly synthetic/simplified) item exposes only one candidate there,
 *    silently hiding a row a caller may still expect to render as a real
 *    choice — the narrower, intent-matching rule avoids that surprise.
 *
 * Only returns entries for `e` when it has exactly one candidate AND is not
 * already set to it, so callers can call this on every render/effect
 * without producing redundant no-op updates or ever touching a
 * multi-candidate group (which never satisfies the `length === 1` check
 * regardless of scope).
 */
export function computeAutoSelections(
  selected: Readonly<Record<SpellGroup, string | null>>,
  candidatesByGroup: Partial<Record<SpellGroup, readonly SpellCandidate[]>>
): Partial<Record<SpellGroup, string>> {
  const updates: Partial<Record<SpellGroup, string>> = {};
  for (const group of AUTO_SELECT_GROUPS) {
    const candidates = candidatesByGroup[group];
    if (!candidates || candidates.length !== 1) continue;
    const onlyCandidate = candidates[0].uniquename;
    if (selected[group] !== onlyCandidate) {
      updates[group] = onlyCandidate;
    }
  }
  return updates;
}
