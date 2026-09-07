/**
 * Resolves the full spell list for an Albion Online item by walking its
 * craftingspelllist inheritance chain (multi-level, with removespell support).
 *
 * Data shape (from ao-bin-dumps repo-root items.json, NOT formatted/items.json —
 * see decision-004 for why formatted/items.json cannot be used):
 *   item.craftingspelllist["@reference"] → uniquename of parent item
 *   item.craftingspelllist.craftspell    → array of { @uniquename, @slots? }
 *   item.craftingspelllist.removespell   → array (or single obj) of { @uniquename }
 *
 * `@slots` is NOT the active/passive discriminator — it is the slot index
 * within the spell's own group (e.g. an armor's second passive has @slots=2).
 * Classification of active/passive/toggle must come from spells.json and is
 * passed in via the `spellKinds` map.
 */

export type RawSpell = {
  "@uniquename": string;
  "@slots"?: string | number;
};

export type RawCraftingSpellList = {
  "@reference"?: string;
  craftspell?: RawSpell | RawSpell[];
  removespell?: RawSpell | RawSpell[];
};

export type RawItem = {
  "@uniquename": string;
  "@slottype"?: string;
  craftingspelllist?: RawCraftingSpellList;
};

export type SpellKind = "active" | "passive" | "toggle";

export type ResolvedSpell = {
  uniquename: string;
  /** slot index within the spell's own group ("1", "2", ...); "1" when absent */
  slot: string;
  kind: SpellKind;
};

/**
 * Build a plain-object-shaped registry keyed by an upstream-controlled string
 * (e.g. a spell or item `uniquename`) without risking prototype pollution.
 * A literal `{}` would let a key of `__proto__` silently rewrite the
 * object's prototype instead of being stored, dropping that entry from the
 * output with no error — this uses a null-prototype object instead, which
 * `JSON.stringify` serializes identically to a plain object.
 */
export function safeKeyedRecord<T>(
  entries: Iterable<[string, T]>,
): Record<string, T> {
  const out: Record<string, T> = Object.create(null);
  for (const [key, value] of entries) {
    out[key] = value;
  }
  return out;
}

/** Normalize a potentially single-object or array field to always be an array. */
function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

const NON_CATEGORY_KEYS = new Set([
  "@xmlns:xsi",
  "@xsi:noNamespaceSchemaLocation",
  "shopcategories",
  "hideoutitem",
]);

/**
 * Enumerate every equippable item category under the root `items` object,
 * normalizing single-object categories (a classic xml2json collapse failure
 * mode) into arrays via `toArray`. Shared by `buildItemIndex` and any
 * consumer (e.g. sync-ao-data's `categoryOf`) that needs to know which item
 * belongs to which category, so `NON_CATEGORY_KEYS` has exactly one
 * authoritative definition.
 */
export function enumerateItemCategories(
  rawItems: unknown,
): Array<[string, RawItem[]]> {
  if (Array.isArray(rawItems)) {
    return [["items", rawItems as RawItem[]]];
  }

  const root = rawItems as Record<string, unknown>;
  const items = root["items"] as Record<string, unknown> | undefined;
  if (!items) return [];

  const categories: Array<[string, RawItem[]]> = [];
  for (const [key, value] of Object.entries(items)) {
    if (NON_CATEGORY_KEYS.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (typeof value !== "object") continue;
    categories.push([key, toArray(value as RawItem | RawItem[])]);
  }
  return categories;
}

/**
 * Build a lookup map from uniquename → item, indexing every equippable
 * category under the root `items` object. References in craftingspelllist
 * can cross categories (e.g. a weapon referencing another weapon), so all
 * categories are indexed into a single flat map.
 */
export function buildItemIndex(rawItems: unknown): Map<string, RawItem> {
  const map = new Map<string, RawItem>();

  for (const [, categoryItems] of enumerateItemCategories(rawItems)) {
    for (const it of categoryItems) {
      const name = it?.["@uniquename"];
      if (name) map.set(name, it);
    }
  }

  return map;
}

/**
 * Resolve the final ordered spell list for an item, following its
 * craftingspelllist ancestry until there is no parent or a cycle is detected.
 *
 * `spellKinds` classifies each spell as active/passive/toggle — this MUST
 * come from spells.json (activespell/passivespell/togglespell keys), never
 * inferred from `@slots` (see decision-004 bug #3). Spells absent from
 * `spellKinds` default to "active".
 *
 * Returns an empty array (not an error) for items that legitimately have no
 * spells (bags, capes, etc.) — the caller is responsible for logging those.
 */
export function resolveSpells(
  itemId: string,
  index: Map<string, RawItem>,
  spellKinds: Map<string, SpellKind>,
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
    current = item.craftingspelllist?.["@reference"];
  }

  // Replay from root (last in chain) to leaf (first), accumulating spells.
  // Each level can add spells and remove inherited ones.
  const accumulated = new Map<string, ResolvedSpell>(); // keyed by uniquename

  for (let i = chain.length - 1; i >= 0; i--) {
    const item = chain[i];
    const list = item.craftingspelllist;
    if (!list) continue;

    for (const s of toArray(list.craftspell)) {
      const name = s["@uniquename"];
      const slot = String(s["@slots"] ?? "1");
      const kind = spellKinds.get(name) ?? "active";
      accumulated.set(name, { uniquename: name, slot, kind });
    }

    for (const r of toArray(list.removespell)) {
      accumulated.delete(r["@uniquename"]);
    }
  }

  return Array.from(accumulated.values());
}
