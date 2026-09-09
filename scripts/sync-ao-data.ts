#!/usr/bin/env node
/**
 * AO data pipeline:
 *   Step 1 — download raw dumps to .cache/ (7-day TTL, --force)
 *   Step 2 — index item names (formatted/items.json) and spell names (localization.json)
 *   Step 3 — classify spells active/passive/toggle from spells.json
 *   Step 4 — resolve spells per item (repo-root items.json), filter, emit src/data/ao-data.json
 *
 * Sources: ao-data/ao-bin-dumps on GitHub (community-converted game XML).
 *
 * See decision-004 for why gameplay data (items-raw.json) and display names
 * (items.json) come from two different upstream files.
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { pipeline } from "stream/promises";
import { join } from "path";
import {
  buildItemIndex,
  enumerateItemCategories,
  isTwoHanded,
  resolveSpells,
  safeKeyedRecord,
  type SpellKind,
} from "../src/lib/spell-resolver";

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master";
const SOURCES = [
  { name: "items.json",        url: `${BASE}/formatted/items.json` },
  { name: "items-raw.json",    url: `${BASE}/items.json` },
  { name: "spells.json",       url: `${BASE}/spells.json` },
  { name: "localization.json", url: `${BASE}/localization.json` },
] as const;

const CACHE_DIR  = join(process.cwd(), ".cache");
const OUTPUT_DIR = join(process.cwd(), "src", "data");
const OUTPUT     = join(OUTPUT_DIR, "ao-data.json");
const TTL_MS     = 7 * 24 * 60 * 60 * 1000;
const FORCE      = process.argv.includes("--force");

// Guard rails: the original bug shipped precisely because emitting 0 items
// exited 0. See decision-004.
const MIN_ITEMS = 1500;

// Categories emitted as comp items: equippables, plus consumableitem (food/
// potion) filtered further by isEmittedConsumable — see decision-022.
const EMITTED_CATEGORIES = new Set([
  "weapon",
  "equipmentitem",
  "mount",
  "transformationweapon",
  "consumableitem",
]);

// Only food and potion consumables are comp-relevant; raw fish
// (shopcategory=crafting) and vanity fireworks (shopsubcategory1=other) are
// excluded. See decision-022.
const CONSUMABLE_SUBCATEGORIES = new Set(["food", "potions"]);

export function isEmittedConsumable(item: {
  "@shopcategory"?: string;
  "@shopsubcategory1"?: string;
}): boolean {
  return item["@shopcategory"] === "consumables" && CONSUMABLE_SUBCATEGORIES.has(item["@shopsubcategory1"] ?? "");
}

// ─── maxEnchant ───────────────────────────────────────────────────────────────

/**
 * Upstream shape (see decision-011): `enchantments.enchantment` is a nested
 * node on the base item record, one entry per enchant level. Like every
 * other repeated upstream node, the XML→JSON conversion collapses a
 * single-child list to a bare object instead of a 1-element array — so this
 * must be normalized before counting, or a maxEnchant of 1 would silently
 * read back as 0 (or crash on `.length`).
 */
type RawEnchantments = {
  enchantment?: unknown | unknown[];
};

type RawItemWithEnchantments = {
  enchantments?: RawEnchantments;
};

/**
 * `maxEnchant` = count of `enchantments.enchantment` entries on the raw item
 * record, or 0 when the `enchantments` key is absent entirely (per
 * decision-011).
 */
export function computeMaxEnchant(item: RawItemWithEnchantments): number {
  const enchantment = item.enchantments?.enchantment;
  if (enchantment === undefined || enchantment === null) return 0;
  return Array.isArray(enchantment) ? enchantment.length : 1;
}

// ─── Step 1: Download ────────────────────────────────────────────────────────

function isFresh(path: string): boolean {
  if (!existsSync(path)) return false;
  return Date.now() - statSync(path).mtimeMs < TTL_MS;
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`fetch ${url} → ${res.status} ${res.statusText}`);
  // Stream to avoid buffering large (up to ~94 MB) files in RAM
  await pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(dest));
}

async function downloadAll(): Promise<void> {
  mkdirSync(CACHE_DIR, { recursive: true });
  for (const { name, url } of SOURCES) {
    const dest = join(CACHE_DIR, name);
    if (!FORCE && isFresh(dest)) { console.log(`[skip] ${name}`); continue; }
    console.log(`[download] ${name} …`);
    await download(url, dest);
    console.log(`[ok] ${name}`);
  }
}

// ─── Step 2: Localization index (spell names, from TMX localization.json) ────

type SegValue = string | { "#text": string } | undefined;

function extractText(seg: SegValue): string {
  if (!seg) return "";
  if (typeof seg === "string") return seg;
  return seg["#text"] ?? "";
}

const TARGET_LOCALES = ["EN-US", "PT-BR"] as const;

type TmxVariant = { "@xml:lang"?: string; seg?: SegValue };
type TmxEntry = { "@tuid"?: string; tuv?: TmxVariant | TmxVariant[] };

/**
 * Builds an index keyed by bare uniquename, stripping the TMX tuid prefix
 * (`@ITEMS_` / `@SPELLS_`) so callers can look up by uniquename directly.
 * Without this the lookup always misses (decision-004 bug #4).
 */
function buildTmxNameIndex(raw: unknown, prefix: string): Map<string, Record<string, string>> {
  const index = new Map<string, Record<string, string>>();

  const r = raw as Record<string, unknown>;
  const tmx = r["tmx"] as Record<string, unknown> | undefined;
  const body = tmx?.["body"] as Record<string, unknown> | undefined;
  const tuRaw = body?.["tu"];
  const entries: TmxEntry[] = Array.isArray(tuRaw) ? (tuRaw as TmxEntry[]) : [];

  for (const entry of entries) {
    const tuid = entry["@tuid"];
    if (!tuid || !tuid.startsWith(prefix)) continue;
    const id = tuid.slice(prefix.length);

    const tuvRaw = entry.tuv;
    const variants: TmxVariant[] = Array.isArray(tuvRaw) ? tuvRaw : tuvRaw ? [tuvRaw] : [];

    const names: Record<string, string> = {};
    for (const variant of variants) {
      const lang = variant["@xml:lang"];
      if (!lang || !(TARGET_LOCALES as readonly string[]).includes(lang)) continue;
      const text = extractText(variant.seg);
      if (text) names[lang] = text;
    }

    if (Object.keys(names).length > 0) index.set(id, names);
  }

  return index;
}

/**
 * Weapon-type suffixes that upstream strips when a passive is a generic
 * "per weapon family" variant of a base passive (see decision-021 / ACM-079).
 * e.g. `PASSIVE_ARMORCHANCE_SWORD` has no TMX entry of its own — only the
 * weapon-agnostic `PASSIVE_ARMORCHANCE` ("Increased Defense") does.
 */
const WEAPON_SUFFIXES = [
  "_SWORD", "_AXE", "_DAGGER", "_SPEAR", "_BOW", "_CROSSBOW",
  "_CURSEDSTAFF", "_FIRESTAFF", "_FROSTSTAFF", "_ARCANESTAFF",
  "_HOLYSTAFF", "_NATURESTAFF", "_QUARTERSTAFF", "_HAMMER", "_MACE", "_TANK",
] as const;

const TIER_SUFFIX = /^(.+)_T(\d+)$/;
const MAX_TIER = 8;

/** Strips a known prefix/tag noise from a raw spell uniquename before humanizing. */
const HUMANIZE_STRIP_PREFIXES = ["PASSIVE_", "ACTIVE_", "TOGGLE_", "VANITY_"];

/**
 * Explicit overrides for the closed set of uniquenames where a generic
 * `_`-split leaves an unsegmented compound word (the upstream uniquename
 * never had an underscore at the word boundary), see ACM-086. Keyed on the
 * uniquename after prefix stripping (see HUMANIZE_STRIP_PREFIXES) so both
 * `PASSIVE_SMITE_AOE` and `SMITE_AOE` resolve the same way.
 */
const HUMANIZE_OVERRIDES: Record<string, string> = {
  REJUVMUSHROOM_GRENADE: "Rejuv Mushroom Grenade",
  ICEROCK_EXPLODE: "Ice Rock Explode",
  SMITE_AOE: "Smite (AoE)",
  SPEEDARCHER_KITE: "Speed Archer Kite",
  CURSEDHANDS_STACKUP: "Cursed Hands Stack Up",
  CROSSSTEP_ROUNDHOUSE: "Cross Step Roundhouse",
  TRIPLECOMBO_DIVEKICK: "Triple Combo Dive Kick",
  FROSTBOMB_CASTSLOW: "Frost Bomb Cast Slow",
};

/**
 * Last-resort display name for a spell with no upstream translation anywhere
 * in the TMX dump (decision-021): title-cased words from the uniquename,
 * instead of surfacing the raw uniquename to the end user.
 */
export function humanizeSpellName(uniquename: string): string {
  let rest = uniquename;
  for (const prefix of HUMANIZE_STRIP_PREFIXES) {
    if (rest.startsWith(prefix)) { rest = rest.slice(prefix.length); break; }
  }

  const override = HUMANIZE_OVERRIDES[rest];
  if (override) return override;

  return rest
    .split("_")
    .filter(Boolean)
    .map((word) => (word.length <= 2 ? word.toUpperCase() : word[0] + word.slice(1).toLowerCase()))
    .join(" ");
}

/**
 * Resolves the localized names for a spell uniquename against the TMX
 * spell-name index, applying two known upstream key patterns before falling
 * back to a humanized uniquename (see decision-021 / ACM-079):
 *
 *  1. exact match on the uniquename
 *  2. weapon-family passives: strip a known weapon-type suffix and retry
 *     against the weapon-agnostic base spell (e.g. `..._SWORD` → base)
 *  3. tiered passives localized only at one tier (commonly T4): strip the
 *     `_T<n>` suffix and retry every tier — these upstream entries are
 *     identical in name across tiers, only the tier-specific description differs
 *
 * Returns `undefined` when no match is found by any strategy — callers
 * decide the final humanized fallback.
 */
export function resolveSpellLocalizedNames(
  uniquename: string,
  index: Map<string, Record<string, string>>,
): Record<string, string> | undefined {
  const exact = index.get(uniquename);
  if (exact) return exact;

  for (const suffix of WEAPON_SUFFIXES) {
    if (uniquename.endsWith(suffix)) {
      const base = index.get(uniquename.slice(0, -suffix.length));
      if (base) return base;
      break;
    }
  }

  const tierMatch = uniquename.match(TIER_SUFFIX);
  if (tierMatch) {
    const base = tierMatch[1];
    for (let tier = 1; tier <= MAX_TIER; tier++) {
      const found = index.get(`${base}_T${tier}`);
      if (found) return found;
    }
  }

  return undefined;
}

// ─── Step 3: Item name index (formatted/items.json — names only, no gameplay) ─

type FormattedItem = {
  UniqueName?: string;
  LocalizedNames?: Record<string, string> | null;
};

/**
 * Minimum number of locales an item's `LocalizedNames` must cover to be
 * considered released (see decision-024). The SBI localization pipeline is
 * all-or-nothing: shipped items get all 15 locales at once, while
 * unreleased/prototype content only ever has `EN-US`. The distribution over
 * the full corpus (12237 items in `formatted/items.json`) is strictly
 * bimodal — 0 locales: 846 items, 1 locale: 19 items, 15 locales: 11372
 * items — with nothing in between, so there is no gray zone for this
 * threshold to misfire on.
 */
export const MIN_LOCALES_FOR_RELEASED = 2;

/**
 * True when an item's `LocalizedNames` covers at least
 * `MIN_LOCALES_FOR_RELEASED` locales — the signal decision-024 settled on to
 * distinguish released content from unreleased/prototype items. Must be
 * evaluated against the *full* `LocalizedNames` object, before narrowing to
 * `TARGET_LOCALES` — evaluating after narrowing degenerates the rule into
 * "missing PT-BR", which decision-024 explicitly rejected (option C).
 */
export function isReleasedItem(item: { LocalizedNames?: Record<string, string> | null }): boolean {
  if (!item.LocalizedNames) return false;
  return Object.keys(item.LocalizedNames).length >= MIN_LOCALES_FOR_RELEASED;
}

function buildItemNameIndex(raw: unknown): { index: Map<string, Record<string, string>>; unreleased: number } {
  const index = new Map<string, Record<string, string>>();
  const arr = Array.isArray(raw) ? (raw as FormattedItem[]) : [];
  let unreleased = 0;
  for (const it of arr) {
    const id = it.UniqueName;
    if (!id || !it.LocalizedNames) continue;
    if (!isReleasedItem(it)) { unreleased++; continue; }
    const names: Record<string, string> = {};
    for (const locale of TARGET_LOCALES) {
      const v = it.LocalizedNames[locale];
      if (v) names[locale] = v;
    }
    if (Object.keys(names).length > 0) index.set(id, names);
  }
  return { index, unreleased };
}

// ─── Step 4: Spell classification from spells.json ───────────────────────────

const SPELL_KIND_KEYS: Record<string, SpellKind> = {
  activespell: "active",
  passivespell: "passive",
  togglespell: "toggle",
};

function buildSpellKindIndex(raw: unknown): Map<string, SpellKind> {
  const map = new Map<string, SpellKind>();
  const r = raw as Record<string, unknown>;
  const spellsRoot = r["spells"] as Record<string, unknown> | undefined;
  if (!spellsRoot) return map;

  for (const [key, kind] of Object.entries(SPELL_KIND_KEYS)) {
    const arr = spellsRoot[key];
    if (!Array.isArray(arr)) continue;
    for (const s of arr as Array<Record<string, unknown>>) {
      const name = s["@uniquename"] as string | undefined;
      if (name) map.set(name, kind);
    }
  }

  return map;
}

// ─── Step 5: Emit ao-data.json ───────────────────────────────────────────────

async function emit(): Promise<void> {
  console.log("[emit] loading cached files…");
  const rawItemsRaw   = JSON.parse(readFileSync(join(CACHE_DIR, "items-raw.json"), "utf8")) as unknown;
  const rawItemNames  = JSON.parse(readFileSync(join(CACHE_DIR, "items.json"), "utf8")) as unknown;
  const rawSpells     = JSON.parse(readFileSync(join(CACHE_DIR, "spells.json"), "utf8")) as unknown;
  const rawLocaliz    = JSON.parse(readFileSync(join(CACHE_DIR, "localization.json"), "utf8")) as unknown;

  console.log("[emit] indexing item names…");
  const { index: itemNameIndex, unreleased } = buildItemNameIndex(rawItemNames);
  if (unreleased > 0) {
    console.log(`[emit] ${unreleased} itens ignorados como nao-lancados (decision-024)`);
  }

  console.log("[emit] indexing spell names…");
  const spellNameIndex = buildTmxNameIndex(rawLocaliz, "@SPELLS_");

  console.log("[emit] classifying spells…");
  const spellKinds = buildSpellKindIndex(rawSpells);
  if (spellKinds.size === 0 || ![...spellKinds.values()].some((k) => k === "passive")) {
    throw new Error(
      `[fatal] spells.json produced no passive spells (${spellKinds.size} total) — ` +
        "upstream schema likely renamed activespell/passivespell/togglespell keys",
    );
  }

  console.log("[emit] indexing items…");
  const itemIndex = buildItemIndex(rawItemsRaw);

  const categoryOf = new Map<string, string>();
  for (const [category, categoryItems] of enumerateItemCategories(rawItemsRaw)) {
    for (const it of categoryItems) {
      const name = it["@uniquename"];
      if (name) categoryOf.set(name, category);
    }
  }

  const items: unknown[] = [];
  let skipped = 0;

  for (const [id, item] of itemIndex) {
    const category = categoryOf.get(id);
    if (!category || !EMITTED_CATEGORIES.has(category)) { skipped++; continue; }
    if (category === "consumableitem" && !isEmittedConsumable(item as { "@shopcategory"?: string; "@shopsubcategory1"?: string })) {
      skipped++;
      continue;
    }

    const slot = item["@slottype"];
    if (!slot) { skipped++; continue; }

    const names = itemNameIndex.get(id);
    if (!names || !names["EN-US"]) { skipped++; continue; }

    const resolved = resolveSpells(id, itemIndex, spellKinds);
    const spells = resolved.map((s) => ({
      uniquename: s.uniquename,
      slotGroup: s.slot,
      kind: s.kind,
      // resolveSpellLocalizedNames covers weapon-family and tiered upstream
      // key patterns; humanizeSpellName is the last resort for spells with
      // no TMX entry under any pattern (decision-021 / ACM-079).
      localizedNames: resolveSpellLocalizedNames(s.uniquename, spellNameIndex) ?? {
        "EN-US": humanizeSpellName(s.uniquename),
      },
    }));

    items.push({
      uniquename: id,
      slot,
      localizedNames: names,
      spells,
      twohanded: isTwoHanded(item),
      maxEnchant: computeMaxEnchant(item as RawItemWithEnchantments),
    });
  }

  if (items.length < MIN_ITEMS) {
    throw new Error(
      `[fatal] only ${items.length} items emitted (minimum ${MIN_ITEMS}) — pipeline is likely broken, see decision-004`,
    );
  }

  for (const requiredSlot of ["food", "potion"] as const) {
    const count = items.filter((it) => (it as { slot: string }).slot === requiredSlot).length;
    if (count === 0) {
      throw new Error(
        `[fatal] no items emitted for slot "${requiredSlot}" — consumable classification is broken, see decision-022`,
      );
    }
  }

  const hasPassiveSpell = items.some((it) =>
    (it as { spells: Array<{ kind: SpellKind }> }).spells.some((s) => s.kind === "passive"),
  );
  if (!hasPassiveSpell) {
    throw new Error("[fatal] no passive spells emitted across any item — spell classification is broken");
  }

  // Spells registry (all known spells, keyed by upstream-controlled uniquename —
  // see safeKeyedRecord for why this must not be a plain object literal).
  const spells = safeKeyedRecord(
    [...spellKinds].map(([uniquename, kind]) => [
      uniquename,
      {
        uniquename,
        kind,
        localizedNames: resolveSpellLocalizedNames(uniquename, spellNameIndex) ?? {
          "EN-US": humanizeSpellName(uniquename),
        },
      },
    ]),
  );

  const output = {
    version: new Date().toISOString().slice(0, 10),
    items,
    spells,
  };

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(output, null, 2), "utf8");

  console.log(`[ok] ao-data.json — ${items.length} items, ${Object.keys(spells).length} spells (${skipped} items skipped)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  await downloadAll();
  await emit();
}

// Guard so this module can be imported (e.g. by tests) without running the
// full download+emit pipeline as a side effect of the import itself.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
