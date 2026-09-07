"use client";

import { useEffect, useState } from "react";
import type { AOItem } from "@/data/ao-data.d";

type CatalogueState =
  | { status: "loading" }
  | { status: "loaded"; items: AOItem[] }
  | { status: "failed" };

let cached: CatalogueState | null = null;
let inflight: Promise<CatalogueState> | null = null;

/**
 * Fetches the ao-data.json catalogue (ACM-002/004) via `/api/items`
 * (ACM-034/043). The raw artifact lives at `src/data/ao-data.json`, which is
 * a build-time asset the browser cannot resolve as a module specifier (and
 * is gitignored — absent until `npm run sync:ao` runs, see .gitignore), so
 * it must be served through a route handler that reads it with Node `fs`
 * (same pattern as `src/app/api/icon/route.ts`), not imported client-side.
 *
 * Result is cached at module scope so re-opening the picker never refetches.
 * A failed fetch/non-2xx response is cached as `"failed"`, distinct from
 * `"loaded"` with an empty array — an empty catalogue and an unreachable one
 * must never look the same to callers.
 */
function loadCatalogue(): Promise<CatalogueState> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;

  inflight = fetch("/api/items")
    .then(async (response) => {
      if (!response.ok) {
        cached = { status: "failed" };
        return cached;
      }
      const items = (await response.json()) as AOItem[];
      cached = { status: "loaded", items };
      return cached;
    })
    .catch(() => {
      cached = { status: "failed" };
      return cached;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export type UseItemCatalogueResult = {
  items: AOItem[];
  /** True while the initial fetch is in flight. */
  loading: boolean;
  /**
   * True when the catalogue fetch failed or the server reported the
   * artifact as unavailable (e.g. `npm run sync:ao` was never run). Distinct
   * from a successful load that simply has no matches for the user's query.
   */
  failed: boolean;
};

/** Test-only escape hatch: resets the module-level cache between test cases. */
export function __resetItemCatalogueCacheForTests(): void {
  cached = null;
  inflight = null;
}

export function useItemCatalogue(): UseItemCatalogueResult {
  const [state, setState] = useState<CatalogueState>(cached ?? { status: "loading" });

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    loadCatalogue().then((loaded) => {
      if (!cancelled) setState(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    items: state.status === "loaded" ? state.items : [],
    loading: state.status === "loading",
    failed: state.status === "failed",
  };
}
