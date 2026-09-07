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
import { buildItemIndex, resolveSpells, type SpellKind } from "../src/lib/spell-resolver";

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

// Only equippable categories are emitted as comp items.
const EQUIPPABLE_CATEGORIES = new Set(["weapon", "equipmentitem", "mount", "transformationweapon"]);

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

// ─── Step 3: Item name index (formatted/items.json — names only, no gameplay) ─

type FormattedItem = {
  UniqueName?: string;
  LocalizedNames?: Record<string, string> | null;
};

function buildItemNameIndex(raw: unknown): Map<string, Record<string, string>> {
  const index = new Map<string, Record<string, string>>();
  const arr = Array.isArray(raw) ? (raw as FormattedItem[]) : [];
  for (const it of arr) {
    const id = it.UniqueName;
    if (!id || !it.LocalizedNames) continue;
    const names: Record<string, string> = {};
    for (const locale of TARGET_LOCALES) {
      const v = it.LocalizedNames[locale];
      if (v) names[locale] = v;
    }
    if (Object.keys(names).length > 0) index.set(id, names);
  }
  return index;
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
  const itemNameIndex = buildItemNameIndex(rawItemNames);

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

  const rawRoot = rawItemsRaw as Record<string, unknown>;
  const categoriesRoot = (rawRoot["items"] as Record<string, unknown> | undefined) ?? {};
  const categoryOf = new Map<string, string>();
  for (const [category, value] of Object.entries(categoriesRoot)) {
    if (!Array.isArray(value)) continue;
    for (const it of value as Array<Record<string, unknown>>) {
      const name = it["@uniquename"] as string | undefined;
      if (name) categoryOf.set(name, category);
    }
  }

  const items: unknown[] = [];
  let skipped = 0;

  for (const [id, item] of itemIndex) {
    const category = categoryOf.get(id);
    if (!category || !EQUIPPABLE_CATEGORIES.has(category)) { skipped++; continue; }

    const slot = item["@slottype"];
    if (!slot) { skipped++; continue; }

    const names = itemNameIndex.get(id);
    if (!names || !names["EN-US"]) { skipped++; continue; }

    const resolved = resolveSpells(id, itemIndex, spellKinds);
    const spells = resolved.map((s) => ({
      uniquename: s.uniquename,
      slot: s.slot,
      kind: s.kind,
      // fallback to uniquename for utility spells absent from localization
      // (e.g. PASSIVE_BACKPACK_*) — see decision-004
      localizedNames: spellNameIndex.get(s.uniquename) ?? { "EN-US": s.uniquename },
    }));

    items.push({ uniquename: id, slot, localizedNames: names, spells });
  }

  if (items.length < MIN_ITEMS) {
    throw new Error(
      `[fatal] only ${items.length} items emitted (minimum ${MIN_ITEMS}) — pipeline is likely broken, see decision-004`,
    );
  }

  const hasPassiveSpell = items.some((it) =>
    (it as { spells: Array<{ kind: SpellKind }> }).spells.some((s) => s.kind === "passive"),
  );
  if (!hasPassiveSpell) {
    throw new Error("[fatal] no passive spells emitted across any item — spell classification is broken");
  }

  // Spells registry (all known spells, keyed by uniquename)
  const spells: Record<string, unknown> = {};
  for (const [uniquename, kind] of spellKinds) {
    spells[uniquename] = {
      uniquename,
      kind,
      localizedNames: spellNameIndex.get(uniquename) ?? { "EN-US": uniquename },
    };
  }

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

main().catch((err) => { console.error(err); process.exit(1); });
