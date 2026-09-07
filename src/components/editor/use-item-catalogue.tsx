"use client";

import { useEffect, useState } from "react";
import type { AOData, AOItem } from "@/data/ao-data.d";

let cachedItems: AOItem[] | null = null;
let inflight: Promise<AOItem[]> | null = null;

/**
 * Lazily loads the ao-data.json catalogue emitted by the data pipeline
 * (ACM-002/004) at `src/data/ao-data.json`. That artifact is gitignored
 * (generated, committed only after a full sync — see .gitignore) and is
 * NOT guaranteed to exist in every checkout/CI run, so it must not be a
 * statically-resolvable `import`/`require` specifier: `tsc`/`next build`
 * fails outright with "module not found" whenever the pipeline has not
 * run yet, which is the state of every CI build today (the `check`
 * workflow never runs `pnpm sync:ao`).
 *
 * `turbopackIgnore` tells the bundler to leave this specifier alone instead
 * of trying to resolve it at build time, so `next build` always succeeds
 * regardless of whether the artifact exists. The tradeoff (tracked as a
 * known gap in ACM-027's implementation notes, not solved here — this task
 * is scoped to wiring the picker open/close/select flow, not the data
 * pipeline → editor plumbing) is that this becomes a genuine runtime
 * module specifier the browser must resolve itself; today nothing serves
 * `@/data/ao-data.json` to the browser, so the import always rejects and
 * we fall back to an empty catalogue rather than crashing the editor. Once
 * a follow-up task wires a real fetch/serving path for the artifact, only
 * this function needs to change — every caller here just awaits `AOItem[]`.
 *
 * Result is cached at module scope so re-opening the picker never re-loads.
 */
function loadCatalogue(): Promise<AOItem[]> {
  if (cachedItems) return Promise.resolve(cachedItems);
  if (inflight) return inflight;

  const dir = "@/data/";
  const file = "ao-data.json";
  inflight = import(/* turbopackIgnore: true */ dir + file)
    .then((mod: { default: AOData }) => {
      cachedItems = mod.default.items;
      return cachedItems;
    })
    .catch(() => {
      cachedItems = [];
      return cachedItems;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export type UseItemCatalogueResult = {
  items: AOItem[];
  loading: boolean;
};

/** Test-only escape hatch: resets the module-level cache between test cases. */
export function __resetItemCatalogueCacheForTests(): void {
  cachedItems = null;
  inflight = null;
}

export function useItemCatalogue(): UseItemCatalogueResult {
  const [items, setItems] = useState<AOItem[]>(cachedItems ?? []);
  const [loading, setLoading] = useState(cachedItems === null);

  useEffect(() => {
    if (cachedItems) return;
    let cancelled = false;
    loadCatalogue().then((loaded) => {
      if (!cancelled) {
        setItems(loaded);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { items, loading };
}
