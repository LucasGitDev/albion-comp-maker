import { promises as fs } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { NextRequest, NextResponse } from "next/server";
import type { AOData, AOItem } from "@/data/ao-data.d";

const ARTIFACT_PATH = path.join(process.cwd(), "src", "data", "ao-data.json");

// Immutable for the lifetime of a deploy: the artifact only changes when a
// new `sync:ao` run replaces it, which always ships as a new deploy. Safe to
// cache hard on both the CDN/browser and this route's own in-memory cache.
const CACHE_CONTROL = "public, max-age=31536000, immutable";

let cachedItems: AOItem[] | null = null;
let cachedItemsJson: string | null = null;
let cachedItemsGzip: Buffer | null = null;

/**
 * Only the fields ItemPicker/SlotCard actually read (see AOItem). Excludes
 * the top-level `spells` registry from ao-data.json entirely — nothing on
 * this path resolves spell metadata by uniquename, so shipping it would
 * roughly double the payload for no benefit (raw items ~2.0MB vs the full
 * artifact's ~5.2MB, itemized in ACM-034/043 implementation notes).
 */
function toWireItem(item: AOItem): AOItem {
  return {
    uniquename: item.uniquename,
    slot: item.slot,
    localizedNames: item.localizedNames,
    spells: item.spells,
    twohanded: item.twohanded,
    maxEnchant: item.maxEnchant,
  };
}

async function loadItemsJson(): Promise<string> {
  if (cachedItemsJson) return cachedItemsJson;
  const raw = await fs.readFile(ARTIFACT_PATH, "utf-8");
  const data = JSON.parse(raw) as AOData;
  cachedItems = data.items.map(toWireItem);
  cachedItemsJson = JSON.stringify(cachedItems);
  return cachedItemsJson;
}

/**
 * Next's App Router route handlers are not covered by the framework's
 * built-in `compress` option (that only applies to page requests) — a
 * plain `NextResponse.json` here ships ~2.0MB uncompressed even behind
 * `next start`, verified during ACM-034/043 review. Gzip is done here
 * explicitly and cached alongside the parsed items so repeat requests never
 * re-compress: raw items ~2.0MB -> gzip ~63KB, a ~97% reduction, worth
 * doing at this layer since not every deploy target (e.g. a bare Node
 * host) fronts the app with a compressing proxy/CDN.
 */
function loadItemsGzip(json: string): Buffer {
  if (cachedItemsGzip) return cachedItemsGzip;
  cachedItemsGzip = gzipSync(json);
  return cachedItemsGzip;
}

export type ItemsErrorResponse = {
  error: string;
  code: "CATALOGUE_UNAVAILABLE";
};

/**
 * Serves the item catalogue emitted by the data pipeline (ACM-002/004) to
 * the browser. The artifact is a build output, gitignored and not present
 * until `npm run sync:ao` has run (see .gitignore) — that is the normal
 * state of every fresh checkout and of CI, so a missing file is an expected,
 * typed condition, not a crash: callers get a 503 with a machine-readable
 * `code` they can branch on, never a silently empty list (ACM-043).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const json = await loadItemsJson();
    const acceptEncoding = request.headers.get("accept-encoding") ?? "";

    if (acceptEncoding.includes("gzip")) {
      const gzipped = loadItemsGzip(json);
      return new NextResponse(new Uint8Array(gzipped), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "gzip",
          "Cache-Control": CACHE_CONTROL,
        },
      });
    }

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch (error) {
    const isMissing = (error as NodeJS.ErrnoException)?.code === "ENOENT";
    if (!isMissing) {
      // Malformed artifact or unexpected fs error: still typed, still 503,
      // but worth distinguishing in logs from the expected missing-file case.
      console.error("Failed to load item catalogue", error);
    }
    const body: ItemsErrorResponse = {
      error: isMissing
        ? "Item catalogue not found. Run `npm run sync:ao` to generate src/data/ao-data.json."
        : "Item catalogue could not be read.",
      code: "CATALOGUE_UNAVAILABLE",
    };
    return NextResponse.json(body, { status: 503 });
  }
}
