#!/usr/bin/env node
/**
 * Step 1 of the AO data pipeline: download raw dumps to .cache/
 * with a 7-day TTL. Pass --force to re-download regardless of age.
 *
 * Sources: ao-data/ao-bin-dumps on GitHub (community-converted game XML).
 */

import { createWriteStream, existsSync, mkdirSync, statSync } from "fs";
import { pipeline } from "stream/promises";
import { join } from "path";

const BASE =
  "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted";

const SOURCES = [
  { name: "items.json", url: `${BASE}/items.json` },
  { name: "spells.json", url: `${BASE}/spells.json` },
  { name: "localization.json", url: `${BASE}/localization.json` },
] as const;

const CACHE_DIR = join(process.cwd(), ".cache");
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FORCE = process.argv.includes("--force");

function isFresh(path: string): boolean {
  if (!existsSync(path)) return false;
  const age = Date.now() - statSync(path).mtimeMs;
  return age < TTL_MS;
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`fetch ${url} → ${res.status} ${res.statusText}`);
  }
  const writer = createWriteStream(dest);
  // Stream to disk to avoid loading 94 MB localization into RAM
  await pipeline(res.body as unknown as NodeJS.ReadableStream, writer);
}

async function main(): Promise<void> {
  mkdirSync(CACHE_DIR, { recursive: true });

  for (const { name, url } of SOURCES) {
    const dest = join(CACHE_DIR, name);
    if (!FORCE && isFresh(dest)) {
      console.log(`[skip] ${name} (< 7 days old)`);
      continue;
    }
    console.log(`[download] ${name} …`);
    await download(url, dest);
    console.log(`[ok] ${name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
