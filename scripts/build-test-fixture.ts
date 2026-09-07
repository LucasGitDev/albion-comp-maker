/**
 * Emits src/__tests__/fixtures/ao-corpus.json — a pruned real corpus derived
 * from src/data/ao-data.json, used as the incontrovertible ground truth for
 * Phase 1 acceptance tests (see decision-005).
 *
 * Kept: per item `uniquename`, `slot`, `spells[{uniquename, slotGroup, kind}]`;
 * a registry reduced to `uniquename -> kind`, trimmed to only spells actually
 * referenced by an item's resolved spell list.
 *
 * Dropped: `localizedNames` everywhere — decouples the acceptance invariants
 * from translation churn and is most of the size reduction (5.1 MB -> ~0.54 MB).
 *
 * Run via `pnpm build:fixture` after `pnpm sync:ao`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { AOData } from "../src/data/ao-data.d.ts";

const AO_DATA_PATH = path.resolve(import.meta.dirname, "../src/data/ao-data.json");

type PrunedSpell = {
  uniquename: string;
  slotGroup: string;
  kind: string;
};

type PrunedItem = {
  uniquename: string;
  slot: string;
  spells: PrunedSpell[];
};

type PrunedCorpus = {
  items: PrunedItem[];
  spells: Record<string, string>;
};

function main(): void {
  const data = JSON.parse(readFileSync(AO_DATA_PATH, "utf-8")) as AOData;

  const referencedSpells = new Set<string>();

  const items: PrunedItem[] = data.items.map((item) => {
    const spells: PrunedSpell[] = item.spells.map((s) => {
      referencedSpells.add(s.uniquename);
      return { uniquename: s.uniquename, slotGroup: s.slotGroup, kind: s.kind };
    });
    return { uniquename: item.uniquename, slot: item.slot, spells };
  });

  const spells: Record<string, string> = Object.create(null);
  for (const name of referencedSpells) {
    const entry = data.spells[name];
    // Every spell referenced by a resolved item must exist in the registry —
    // if not, that's the exact regression AC-4 exists to catch, and the fixture
    // build itself must fail loudly rather than silently omitting the key.
    if (!entry) {
      throw new Error(
        `build-test-fixture: spell "${name}" is referenced by an item but missing from the registry`,
      );
    }
    spells[name] = entry.kind;
  }

  // No `version` field: the upstream sync stamps it with the wall-clock date
  // (see sync-ao-data.ts), which is not a property of the data itself and
  // would make the nightly drift check (`git diff --exit-code` on this file)
  // fail every single day regardless of whether Albion data actually changed.
  const corpus: PrunedCorpus = { items, spells };

  const outPath = path.resolve(
    import.meta.dirname,
    "../src/__tests__/fixtures/ao-corpus.json",
  );
  writeFileSync(outPath, JSON.stringify(corpus), "utf-8");

  console.log(
    `build-test-fixture: wrote ${outPath} (${items.length} items, ${Object.keys(spells).length} spells)`,
  );
}

main();
