import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardSlotTile } from "@/components/build-card/CardSlotTile";
import { DEFAULT_BUILD_CARD_THEME, type BuildCardLookups } from "@/components/build-card/types";
import { resolvePresetTokens } from "@/components/build-card/theme-presets";
import type { EquippedItem } from "@/types/build";

/**
 * ACM-090 reviewer round 2 (HIGH + MEDIUM): the previous test suite for this
 * task only exercised the editor's `SlotCard` with `item.spells.passive:
 * null` in every case, so it never caught the exported-card regression: a
 * `spellGroupsByItem` entry still including "passive" makes `SpellRow`
 * render a `SpellIcon` whose `sprite` is `null` (no `item.spells.passive`
 * set) — `SpellIcon` treats that as its "empty" state but still draws the
 * "P" slot-label badge, leaving a chip-less "P" pill hanging under every
 * capa/bolsa/montaria in the Discord-ready PNG.
 *
 * This renders `CardSlotTile` directly (the real consumer of
 * `BuildCardLookups.spellGroupsByItem`, shared by `SpellRow`) for a cape
 * whose `EquippedItem.spells.passive` is populated (the legacy-data case)
 * with a `lookups` shape matching what `buildCardLookupsFor` now produces
 * for that slot (no "passive" key) — the fix under test is upstream, in
 * `groupSpellsForItem`/`spellGroupsByItem`, not in this component.
 */
describe("CardSlotTile passive exclusion for non-selectable categories (ACM-090)", () => {
  function cardLookups(spellGroupsByItem: BuildCardLookups["spellGroupsByItem"]): BuildCardLookups {
    return {
      itemNames: { T4_CAPEITEM_FW_BRIDGEWATCH: "Bridgewatch Cape" },
      spellNames: { PASSIVE_CAPE_BRIDGEWATCH: "Sandstorm" },
      spellGroupsByItem,
    };
  }

  const capeItem: EquippedItem = {
    itemId: "T4_CAPEITEM_FW_BRIDGEWATCH",
    tier: 4,
    enchant: 0,
    // Legacy/orphaned value selected before ACM-090 excluded passive picking
    // for cape in the editor.
    spells: { q: null, w: null, e: null, passive: "PASSIVE_CAPE_BRIDGEWATCH" },
    twohanded: false,
    maxEnchant: 0,
  };

  it('renders no "P" badge for a cape when spellGroupsByItem correctly excludes "passive"', () => {
    render(
      <CardSlotTile
        slot="cape"
        item={capeItem}
        lookups={cardLookups({ T4_CAPEITEM_FW_BRIDGEWATCH: [] })}
        showItemNames={false}
        showSpellNames={true}
        tokens={resolvePresetTokens(DEFAULT_BUILD_CARD_THEME.preset)}
      />
    );

    expect(screen.queryByText("P")).toBeNull();
  });

  it('regression guard: would render a "P" badge if spellGroupsByItem still included "passive" (proves the assertion is meaningful)', () => {
    render(
      <CardSlotTile
        slot="cape"
        item={capeItem}
        lookups={cardLookups({ T4_CAPEITEM_FW_BRIDGEWATCH: ["passive"] })}
        showItemNames={false}
        showSpellNames={true}
        tokens={resolvePresetTokens(DEFAULT_BUILD_CARD_THEME.preset)}
      />
    );

    expect(screen.queryByText("P")).not.toBeNull();
  });
});
