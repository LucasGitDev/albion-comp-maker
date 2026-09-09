"use client";

import { useCallback, useEffect, useState } from "react";
import type { AOItem } from "@/data/ao-data.d";
import type { ItemsErrorResponse } from "@/app/api/items/route";

/**
 * `"missing-artifact"` is the ONLY case where suggesting `npm run sync:ao`
 * is correct — it means the server itself reported the machine-readable
 * `503 {code: "CATALOGUE_UNAVAILABLE"}` from `src/app/api/items/route.ts`,
 * which that route only returns for the developer-facing "pipeline never
 * ran" condition. Every other failure (network rejection, a non-503 status,
 * a 503 whose body isn't that shape, a JSON parse error) is `"generic"` and
 * must show ordinary user-facing copy — telling a guild leader to run a
 * terminal command for a transient network blip or deploy hiccup is
 * actively wrong (ACM-034 follow-up review).
 */
type CatalogueFailureReason = "missing-artifact" | "generic";

type CatalogueState =
  | { status: "loading" }
  | { status: "loaded"; items: AOItem[] }
  | { status: "failed"; reason: CatalogueFailureReason };

async function classifyFailure(response: Response): Promise<CatalogueFailureReason> {
  if (response.status !== 503) return "generic";
  try {
    const body = (await response.clone().json()) as Partial<ItemsErrorResponse>;
    return body.code === "CATALOGUE_UNAVAILABLE" ? "missing-artifact" : "generic";
  } catch {
    return "generic";
  }
}

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
 * A successful load is cached at module scope so re-opening the picker never
 * refetches. A failed fetch/non-2xx response is surfaced as `"failed"`,
 * distinct from `"loaded"` with an empty array — an empty catalogue and an
 * unreachable one must never look the same to callers — but is deliberately
 * NOT written to the module cache: caching a failure permanently would make
 * it unrecoverable for the rest of the session (e.g. running
 * `npm run sync:ao` after the first failed attempt would never be reflected
 * without a full page reload). `useItemCatalogue`'s `retry()` relies on this
 * to re-run the fetch on demand.
 */
function loadCatalogue(): Promise<CatalogueState> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;

  inflight = fetch("/api/items")
    .then(async (response) => {
      if (!response.ok) {
        const reason = await classifyFailure(response);
        return { status: "failed", reason } as const;
      }
      const items = (await response.json()) as AOItem[];
      cached = { status: "loaded", items };
      return cached;
    })
    .catch(() => {
      return { status: "failed", reason: "generic" } as const;
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
  /**
   * Only meaningful when `failed` is true. `"missing-artifact"` means the
   * server returned `503 {code: "CATALOGUE_UNAVAILABLE"}` — the local
   * pipeline artifact genuinely never ran — and is the only case where
   * suggesting `npm run sync:ao` is correct. `"generic"` covers everything
   * else (network error, unexpected status, malformed response) and must
   * show ordinary "something went wrong, try again" copy instead (ACM-034
   * follow-up review).
   */
  failedReason: CatalogueFailureReason | null;
  /**
   * Re-runs the fetch on demand. Needed because failure is not cached
   * (see `loadCatalogue`) but the consuming component (the editor page)
   * mounts `useItemCatalogue` once and stays mounted while the picker
   * popover opens/closes — without this, recovering from a failed
   * catalogue would require a full page reload even after
   * `npm run sync:ao` has since been run.
   */
  retry: () => void;
};

/** Test-only escape hatch: resets the module-level cache between test cases. */
export function __resetItemCatalogueCacheForTests(): void {
  cached = null;
  inflight = null;
}

export function useItemCatalogue(): UseItemCatalogueResult {
  const [state, setState] = useState<CatalogueState>(cached ?? { status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    void loadCatalogue().then((loaded) => {
      if (!cancelled) setState(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((current) => current + 1);
  }, []);

  return {
    items: state.status === "loaded" ? state.items : [],
    loading: state.status === "loading",
    failed: state.status === "failed",
    failedReason: state.status === "failed" ? state.reason : null,
    retry,
  };
}
