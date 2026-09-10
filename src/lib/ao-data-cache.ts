import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import type { AOData } from "@/data/ao-data.d";

const ARTIFACT_PATH = path.join(process.cwd(), "src", "data", "ao-data.json");

let cachedAoData: AOData | null = null;
let cachedMissing = false;
let inflight: Promise<AOData | null> | null = null;

/**
 * Single module-scope cache for the ao-data.json artifact, shared by
 * `/api/items` (route.ts) and SSR consumers (build-card-lookups.ts) so both
 * pay the fs read + JSON.parse cost at most once per server instance, and
 * both see the exact same missing-artifact behavior.
 *
 * The artifact is a build output, gitignored and not present until
 * `npm run sync:ao` has run — that is the normal state of a fresh checkout
 * and of CI, so a missing file resolves to `null` rather than throwing.
 * Any other read/parse failure is rethrown so callers can distinguish and
 * log it, matching the pre-existing behavior of both consumers.
 */
export async function getAoData(): Promise<AOData | null> {
  if (cachedAoData) return cachedAoData;
  if (cachedMissing) return null;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const raw = await fs.readFile(ARTIFACT_PATH, "utf-8");
      const data = JSON.parse(raw) as AOData;
      cachedAoData = data;
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
        cachedMissing = true;
        return null;
      }
      throw error;
    }
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
