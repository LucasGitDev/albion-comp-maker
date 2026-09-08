import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { NextRequest, NextResponse } from "next/server";
import type { AOData, AOItem } from "@/data/ao-data.d";
import {
  checkItemsRateLimit,
  clientKeyFromHeaders,
  throttledApiResponse,
} from "@/lib/editor-api-rate-limit";

const ARTIFACT_PATH = path.join(process.cwd(), "src", "data", "ao-data.json");

// The URL is bare and unversioned (`/api/items`, see
// use-item-catalogue.tsx), so `immutable`/a long max-age is NOT legitimate
// here: the artifact DOES change on every `sync:ao` + deploy (Albion adds
// items every patch), and there is no cache-busting query/path segment for a
// returning user's browser to pick up the change with. Instead we force
// revalidation on every request (`max-age=0, must-revalidate`) and make that
// revalidation cheap via a content-hash ETag: a returning user still pays
// only a 304 (no body) once the in-memory cache below is warm, not a full
// re-download, while a genuinely new artifact is served immediately.
const CACHE_CONTROL = "public, max-age=0, must-revalidate";

let cachedItems: AOItem[] | null = null;
let cachedItemsJson: string | null = null;
let cachedItemsGzip: Buffer | null = null;
let cachedItemsEtag: string | null = null;
let inflightItemsJson: Promise<string> | null = null;

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

/**
 * Reads and parses the artifact exactly once even under concurrent callers.
 * Without this, every request hitting a cold instance (e.g. right after a
 * deploy/scale-out, before `cachedItemsJson` is populated) would each pay
 * its own 2MB `readFile` + `JSON.parse` + gzip — same in-flight-dedup
 * pattern already used client-side in use-item-catalogue.tsx. A rejected
 * in-flight promise clears itself so a transient fs error doesn't
 * permanently poison the cache for later requests.
 */
async function loadItemsJson(): Promise<string> {
  if (cachedItemsJson) return cachedItemsJson;
  if (inflightItemsJson) return inflightItemsJson;

  inflightItemsJson = (async () => {
    const raw = await fs.readFile(ARTIFACT_PATH, "utf-8");
    const data = JSON.parse(raw) as AOData;
    cachedItems = data.items.map(toWireItem);
    cachedItemsJson = JSON.stringify(cachedItems);
    cachedItemsEtag = `"${createHash("sha1").update(cachedItemsJson).digest("hex")}"`;
    return cachedItemsJson;
  })();

  try {
    return await inflightItemsJson;
  } finally {
    inflightItemsJson = null;
  }
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
  const key = clientKeyFromHeaders(request.headers);
  if (!checkItemsRateLimit(key)) {
    return throttledApiResponse();
  }

  try {
    const json = await loadItemsJson();
    const etag = cachedItemsEtag as string;

    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": CACHE_CONTROL,
        },
      });
    }

    const acceptEncoding = request.headers.get("accept-encoding") ?? "";

    if (acceptEncoding.includes("gzip")) {
      const gzipped = loadItemsGzip(json);
      return new NextResponse(new Uint8Array(gzipped), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Encoding": "gzip",
          "Cache-Control": CACHE_CONTROL,
          ETag: etag,
        },
      });
    }

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": CACHE_CONTROL,
        ETag: etag,
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
