/**
 * Resolves the full spell list for an Albion Online item by walking its
 * @craftingspelllist inheritance chain (multi-level, with removespell support).
 *
 * Data shape (from ao-bin-dumps items.json):
 *   item["@craftingspelllist"] → ID of parent spelllist
 *   item.craftingspells.craftingspell → array of { @uniquename, @slot }
 *   item.craftingspells.removespell   → array (or single obj) of { @uniquename }
 */

export type RawSpell = {
  "@uniquename": string;
  "@slot"?: string | number;
};

export type RawItem = {
  "@uniquename": string;
  "@craftingspelllist"?: string;
  craftingspells?: {
    craftingspell?: RawSpell | RawSpell[];
    removespell?: RawSpell | RawSpell[];
  };
};

export type ResolvedSpell = {
  uniquename: string;
  slot: string; // "1" | "2" | "3" | "passive"
};

/** Normalize a potentially single-object or array field to always be an array. */
function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Build a lookup map from uniquename → item.
 * Handles both top-level array and the nested { items: { item: [...] } } shape.
 */
export function buildItemIndex(rawItems: unknown): Map<string, RawItem> {
  let arr: RawItem[];

  if (Array.isArray(rawItems)) {
    arr = rawItems as RawItem[];
  } else {
    // ao-bin-dumps wraps: { items: { item: [...] } }
    const root = rawItems as Record<string, unknown>;
    const items = root["items"] as Record<string, unknown> | undefined;
    const item = items?.["item"];
    arr = Array.isArray(item) ? (item as RawItem[]) : [];
  }

  const map = new Map<string, RawItem>();
  for (const it of arr) {
    if (it["@uniquename"]) map.set(it["@uniquename"], it);
  }
  return map;
}

/**
 * Resolve the final ordered spell list for an item, following its
 * @craftingspelllist ancestry until there is no parent or a cycle is detected.
 *
 * Returns an empty array (not an error) for items that legitimately have no
 * spells (bags, capes, etc.) — the caller is responsible for logging those.
 */
export function resolveSpells(
  itemId: string,
  index: Map<string, RawItem>,
): ResolvedSpell[] {
  // Walk the chain bottom-up, collecting each level.
  const chain: RawItem[] = [];
  const visited = new Set<string>();
  let current: string | undefined = itemId;

  while (current) {
    if (visited.has(current)) break; // cycle detected — stop, don't hang
    visited.add(current);
    const item = index.get(current);
    if (!item) break;
    chain.push(item);
    current = item["@craftingspelllist"];
  }

  // Replay from root (last in chain) to leaf (first), accumulating spells.
  // Each level can add spells and remove inherited ones.
  const accumulated = new Map<string, ResolvedSpell>(); // keyed by uniquename

  for (let i = chain.length - 1; i >= 0; i--) {
    const item = chain[i];
    const spells = item.craftingspells;
    if (!spells) continue;

    // Add new spells from this level
    for (const s of toArray(spells.craftingspell)) {
      const name = s["@uniquename"];
      const slot = String(s["@slot"] ?? "passive");
      accumulated.set(name, { uniquename: name, slot });
    }

    // Remove spells declared at this level
    for (const r of toArray(spells.removespell)) {
      accumulated.delete(r["@uniquename"]);
    }
  }

  return Array.from(accumulated.values());
}
