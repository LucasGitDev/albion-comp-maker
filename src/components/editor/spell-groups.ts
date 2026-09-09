import type { AOItem, AOItemSpell, Slot } from "@/data/ao-data";
import type { SpellGroup } from "@/types/build";
import { resolveLocalizedName } from "@/lib/localized-name";
import type { Locale } from "@/lib/i18n/locales";

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
  locale: Locale
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
      name: resolveLocalizedName(spell.localizedNames, locale) ?? spell.uniquename,
    };
    (groups[group] ??= []).push(candidate);
  }

  return groups;
}

/**
 * ACM-090: slots whose passive is never a selectable ability in-game. Cape,
 * bag and mount items resolve a real `kind: "passive"` spell in ao-data.json
 * (e.g. a cape's set bonus, a bag's carry-weight bonus, a mount's speed
 * perk) — the catalogue data is correct, but that passive is a fixed,
 * always-on property of the item, never a chip the player picks among
 * alternatives the way a weapon's Q/W/E/passive rows work. Food and potion
 * never resolve any spell at all today, so they're already excluded by the
 * data-driven `spellCandidatesByGroup` path; they're listed here too so the
 * result stays correct even if a future catalogue update attaches a spell
 * to one. Explicit exclusion by category (not purely data-driven) because
 * the resolver has no signal distinguishing "always-on passive" from
 * "selectable passive" — see task notes for ACM-090.
 *
 * This is the single source of truth for the exclusion: `groupSpellsForItem`
 * (used by both the editor's picker and the exported build-card lookups)
 * applies it, so no consumer of `groupItemSpells`/`spellCandidatesByGroup`
 * needs to reapply the rule manually. A `BuildState` with a stale/orphaned
 * `spells.passive` value for one of these slots (set before this exclusion
 * existed) is unaffected in behavior: since the "passive" group never
 * appears in `spellGroupsByItem`, no consumer ever renders a chip for it.
 */
export const NON_SELECTABLE_PASSIVE_SLOTS: ReadonlySet<Slot> = new Set([
  "cape",
  "bag",
  "mount",
  "food",
  "potion",
]);

/** Convenience wrapper reading straight off an `AOItem`, applying the ACM-090 exclusion for its slot. */
export function groupSpellsForItem(
  item: Pick<AOItem, "spells" | "slot">,
  locale: Locale
): Partial<Record<SpellGroup, SpellCandidate[]>> {
  const groups = groupItemSpells(item.spells, locale);
  if (!NON_SELECTABLE_PASSIVE_SLOTS.has(item.slot)) return groups;
  const rest = { ...groups };
  delete rest.passive;
  return rest;
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
