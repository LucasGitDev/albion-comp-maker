import "server-only";

import type { AOItem } from "@/data/ao-data.d";
import { groupSpellsForItem } from "@/components/editor/spell-groups";
import type { BuildCardLookups } from "@/components/build-card/types";
import type { BuildState, SpellGroup } from "@/types/build";
import { resolveLocalizedName } from "@/lib/localized-name";
import type { Locale } from "@/lib/i18n/locales";
import { getAoData } from "@/lib/ao-data-cache";

let cachedItemsByUniquename: Map<string, AOItem> | null = null;

/**
 * Derives the uniquename -> item map from the shared `getAoData()` cache
 * (this runs at SSR time on the server, not in the browser — mirrors
 * `src/app/api/items/route.ts`'s own read, but skips the HTTP round-trip
 * since we're already on the server). The derived map is cached separately
 * at module scope so repeated calls don't rebuild it from the shared
 * artifact on every request.
 */
async function loadItemsByUniquename(): Promise<Map<string, AOItem>> {
  if (cachedItemsByUniquename) return cachedItemsByUniquename;

  const data = await getAoData();
  const map = new Map<string, AOItem>();
  if (data) {
    for (const item of data.items) {
      map.set(item.uniquename, item);
    }
  }
  cachedItemsByUniquename = map;
  return map;
}

/** Every `itemId` a `BuildState` references, across the main slots and every swap. */
function collectItemIds(state: BuildState): Set<string> {
  const ids = new Set<string>();
  for (const item of Object.values(state.slots)) {
    if (item) ids.add(item.itemId);
  }
  for (const swap of state.swaps) {
    for (const item of Object.values(swap.slots)) {
      if (item) ids.add(item.itemId);
    }
  }
  return ids;
}

/**
 * Builds the `BuildCardLookups` a public SSR page needs to render a
 * `BuildState` with `BuildCard` (item names, spell names, and which spell
 * groups each equipped item exposes) — same shape the editor builds
 * client-side in `build/new/page.tsx`, just derived here from a direct
 * artifact read instead of `useItemCatalogue()`.
 *
 * If the artifact is missing (fresh checkout, `sync:ao` never ran) this
 * degrades to empty lookups rather than throwing — `CardSlotTile` already
 * falls back to the raw uniquename/all spell groups when a lookup entry is
 * absent, so the page still renders, just with less friendly labels.
 */
export async function buildCardLookupsFor(
  state: BuildState,
  locale: Locale
): Promise<BuildCardLookups> {
  let itemsByUniquename: Map<string, AOItem>;
  try {
    itemsByUniquename = await loadItemsByUniquename();
  } catch {
    return { itemNames: {}, spellNames: {}, spellGroupsByItem: {} };
  }

  const itemNames: Record<string, string> = {};
  const spellNames: Record<string, string> = {};
  const spellGroupsByItem: Record<string, SpellGroup[]> = {};

  for (const itemId of collectItemIds(state)) {
    const item = itemsByUniquename.get(itemId);
    if (!item) continue;

    itemNames[itemId] = resolveLocalizedName(item.localizedNames, locale) ?? item.uniquename;

    // ACM-090: `groupSpellsForItem` (not the raw `groupItemSpells`) applies
    // the cape/bag/mount/food/potion "passive is never selectable"
    // exclusion using `item.slot`, so the exported card never renders a
    // chip the editor's picker wouldn't offer — including for a stale
    // `BuildState.spells.passive` set before this exclusion existed:
    // "passive" simply never appears in `spellGroupsByItem` for these
    // slots, so `SpellRow` never gets a group to render one for.
    const grouped = groupSpellsForItem(item, locale);
    spellGroupsByItem[itemId] = Object.keys(grouped) as SpellGroup[];

    for (const candidates of Object.values(grouped)) {
      for (const candidate of candidates ?? []) {
        spellNames[candidate.uniquename] = candidate.name;
      }
    }
  }

  return { itemNames, spellNames, spellGroupsByItem };
}
