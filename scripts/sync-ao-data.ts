#!/usr/bin/env node
/**
 * AO data pipeline:
 *   Step 1 — download raw dumps to .cache/ (7-day TTL, --force)
 *   Step 2 — index localization (EN-US + PT-BR)
 *   Step 3 — resolve spells per item, filter, emit src/data/ao-data.json
 *
 * Sources: ao-data/ao-bin-dumps on GitHub (community-converted game XML).
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { pipeline } from "stream/promises";
import { join } from "path";
import { buildItemIndex, resolveSpells } from "../src/lib/spell-resolver";

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted";
const SOURCES = [
  { name: "items.json",        url: `${BASE}/items.json` },
  { name: "spells.json",       url: `${BASE}/spells.json` },
  { name: "localization.json", url: `${BASE}/localization.json` },
] as const;

const CACHE_DIR  = join(process.cwd(), ".cache");
const OUTPUT_DIR = join(process.cwd(), "src", "data");
const OUTPUT     = join(OUTPUT_DIR, "ao-data.json");
const TTL_MS     = 7 * 24 * 60 * 60 * 1000;
const FORCE      = process.argv.includes("--force");

// ─── Step 1: Download ────────────────────────────────────────────────────────

function isFresh(path: string): boolean {
  if (!existsSync(path)) return false;
  return Date.now() - statSync(path).mtimeMs < TTL_MS;
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`fetch ${url} → ${res.status} ${res.statusText}`);
  // Stream to avoid buffering 94 MB localization in RAM
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

// ─── Step 2: Localization index ───────────────────────────────────────────────

type SegValue = string | { "#text": string } | undefined;

function extractText(seg: SegValue): string {
  if (!seg) return "";
  if (typeof seg === "string") return seg;
  return seg["#text"] ?? "";
}

type LocalizationEntry = { "@itemid": string; tupleofstrings?: { seg?: SegValue | SegValue[] } };

function buildLocaleIndex(raw: unknown): Map<string, Record<string, string>> {
  // Map: itemId → { locale → name }
  const index = new Map<string, Record<string, string>>();

  // ao-bin-dumps localization.json shape:
  //   { "localization": { "tu": [ { "@itemid": "...", "tupleofstrings": { "seg": [...] } } ] } }
  // or wrapped differently — we try multiple shapes.
  let entries: LocalizationEntry[] = [];

  const r = raw as Record<string, unknown>;
  const loc = r["localization"] as Record<string, unknown> | undefined;
  if (loc) {
    const tu = loc["tu"];
    entries = Array.isArray(tu) ? (tu as LocalizationEntry[]) : [];
  } else if (Array.isArray(raw)) {
    entries = raw as LocalizationEntry[];
  }

  for (const entry of entries) {
    const id = entry["@itemid"];
    if (!id) continue;

    // tupleofstrings.seg is an array aligned to the locales list in the file.
    // ao-bin-dumps uses a fixed locale order; EN-US is typically index 0.
    // We only index the two target locales by scanning all segs for matching ids.
    const segs = entry.tupleofstrings?.seg;
    if (!segs) continue;

    const segArr: SegValue[] = Array.isArray(segs) ? segs : [segs];
    const names: Record<string, string> = {};

    // The localization file encodes locale names in the tu/@tuid attribute or uses
    // a parallel structure. Simplified: store all non-empty segs keyed by position.
    // Caller maps position 0 → EN-US, 1 → PT-BR (ao-bin-dumps convention).
    if (segArr[0]) names["EN-US"] = extractText(segArr[0]);
    if (segArr[1]) names["PT-BR"] = extractText(segArr[1]);

    if (Object.keys(names).length > 0) index.set(id, names);
  }

  return index;
}

// ─── Step 3: Spell index from spells.json ────────────────────────────────────

function buildSpellLocaleIndex(raw: unknown, locIndex: Map<string, Record<string, string>>) {
  const r = raw as Record<string, unknown>;
  const spellsRoot = r["spells"] as Record<string, unknown> | undefined;
  const spellArr = spellsRoot ? spellsRoot["spell"] : raw;
  const arr: Array<Record<string, unknown>> = Array.isArray(spellArr)
    ? (spellArr as Array<Record<string, unknown>>)
    : [];

  const map = new Map<string, { uniquename: string; localizedNames: Record<string, string> }>();
  for (const s of arr) {
    const name = s["@uniquename"] as string | undefined;
    if (!name) continue;
    const locs = locIndex.get(name) ?? {};
    map.set(name, { uniquename: name, localizedNames: locs });
  }
  return map;
}

// ─── Step 4: Emit ao-data.json ───────────────────────────────────────────────

async function emit(): Promise<void> {
  console.log("[emit] loading cached files…");
  const rawItems       = JSON.parse(readFileSync(join(CACHE_DIR, "items.json"), "utf8")) as unknown;
  const rawSpells      = JSON.parse(readFileSync(join(CACHE_DIR, "spells.json"), "utf8")) as unknown;
  const rawLocaliz     = JSON.parse(readFileSync(join(CACHE_DIR, "localization.json"), "utf8")) as unknown;

  console.log("[emit] indexing localization…");
  const locIndex = buildLocaleIndex(rawLocaliz);

  console.log("[emit] indexing spells…");
  const spellMap = buildSpellLocaleIndex(rawSpells, locIndex);

  console.log("[emit] resolving item spells…");
  const itemIndex = buildItemIndex(rawItems);

  const items: unknown[] = [];
  let skipped = 0;

  for (const [id, item] of itemIndex) {
    const slot = (item as Record<string, unknown>)["@slottype"] as string | undefined;
    if (!slot) { skipped++; continue; }

    const locs = locIndex.get(id);
    if (!locs || !locs["EN-US"]) { skipped++; continue; }

    const resolved = resolveSpells(id, itemIndex);
    const spells = resolved.map((s) => ({
      uniquename: s.uniquename,
      slot: s.slot,
      localizedNames: spellMap.get(s.uniquename)?.localizedNames ?? {},
    }));

    items.push({ uniquename: id, slot, localizedNames: locs, spells });
  }

  // Spells registry (all known spells)
  const spells: Record<string, unknown> = {};
  for (const [k, v] of spellMap) spells[k] = v;

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
