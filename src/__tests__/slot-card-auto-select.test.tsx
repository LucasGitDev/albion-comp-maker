import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlotCard } from "@/components/editor/SlotCard";
import type { SpellCandidate } from "@/components/editor/spell-groups";
import type { EquippedItem } from "@/types/build";

/**
 * ACM-089 integration coverage: mounts the real `SlotCard` (not just the
 * pure `computeAutoSelections` helper or a pre-seeded `SpellPicker`) to
 * prove the `useEffect` at SlotCard.tsx:136-144 actually fires
 * `onSpellChange` with the right arguments when an item's E group has
 * exactly one candidate — the reviewer's MEDIUM gap on PR #58.
 */
function equipped(overrides: Partial<EquippedItem>): EquippedItem {
  return {
    itemId: "T4_MAIN_SWORD",
    tier: 4,
    enchant: 0,
    spells: { q: null, w: null, e: null, passive: null },
    twohanded: false,
    maxEnchant: 4,
    ...overrides,
  };
}

const SWORD_E_CANDIDATE: SpellCandidate[] = [{ uniquename: "SWORD_E", name: "Sword E" }];
const AXE_E_CANDIDATE: SpellCandidate[] = [{ uniquename: "AXE_E", name: "Axe E" }];
const MULTI_E_CANDIDATES: SpellCandidate[] = [
  { uniquename: "E_ONE", name: "E One" },
  { uniquename: "E_TWO", name: "E Two" },
];

describe("SlotCard auto-select wiring (ACM-089 AC #1)", () => {
  it("equipping a weapon with a single E candidate auto-fills the E slot via onSpellChange", () => {
    const onSpellChange = vi.fn();
    render(
      <SlotCard
        slot="mainhand"
        item={equipped({})}
        spellCandidatesByGroup={{ e: SWORD_E_CANDIDATE }}
        onRequestItemPick={vi.fn()}
        onSpellChange={onSpellChange}
      />
    );

    expect(onSpellChange).toHaveBeenCalledWith("mainhand", "e", "SWORD_E");
  });

  it("swapping to a different weapon with a different single E candidate re-fires with the new id", () => {
    const onSpellChange = vi.fn();
    const { rerender } = render(
      <SlotCard
        slot="mainhand"
        item={equipped({ itemId: "T4_MAIN_SWORD" })}
        spellCandidatesByGroup={{ e: SWORD_E_CANDIDATE }}
        onRequestItemPick={vi.fn()}
        onSpellChange={onSpellChange}
      />
    );
    expect(onSpellChange).toHaveBeenCalledWith("mainhand", "e", "SWORD_E");

    rerender(
      <SlotCard
        slot="mainhand"
        item={equipped({ itemId: "T4_MAIN_AXE" })}
        spellCandidatesByGroup={{ e: AXE_E_CANDIDATE }}
        onRequestItemPick={vi.fn()}
        onSpellChange={onSpellChange}
      />
    );

    expect(onSpellChange).toHaveBeenCalledWith("mainhand", "e", "AXE_E");
  });

  it("a weapon whose E group has multiple candidates does not auto-fire for e", () => {
    const onSpellChange = vi.fn();
    render(
      <SlotCard
        slot="mainhand"
        item={equipped({})}
        spellCandidatesByGroup={{ e: MULTI_E_CANDIDATES }}
        onRequestItemPick={vi.fn()}
        onSpellChange={onSpellChange}
      />
    );

    const eCalls = onSpellChange.mock.calls.filter((call) => call[1] === "e");
    expect(eCalls).toHaveLength(0);
  });

  it("an explicit user selection for a multi-candidate group is not clobbered by the effect", () => {
    const onSpellChange = vi.fn();
    render(
      <SlotCard
        slot="mainhand"
        item={equipped({ spells: { q: null, w: null, e: "E_TWO", passive: null } })}
        spellCandidatesByGroup={{ e: MULTI_E_CANDIDATES }}
        onRequestItemPick={vi.fn()}
        onSpellChange={onSpellChange}
      />
    );

    const eCalls = onSpellChange.mock.calls.filter((call) => call[1] === "e");
    expect(eCalls).toHaveLength(0);
    // The explicit selection is still reflected in the picker UI, untouched.
    expect(screen.getByTitle("E Two")).toHaveAttribute("aria-pressed", "true");
  });

  it("the effect self-terminates: call count is stable once the store round-trips the auto-pick back into item.spells", () => {
    const onSpellChange = vi.fn();
    const onRequestItemPick = vi.fn();
    const { rerender } = render(
      <SlotCard
        slot="mainhand"
        item={equipped({})}
        spellCandidatesByGroup={{ e: SWORD_E_CANDIDATE }}
        onRequestItemPick={onRequestItemPick}
        onSpellChange={onSpellChange}
      />
    );
    expect(onSpellChange).toHaveBeenCalledTimes(1);
    expect(onSpellChange).toHaveBeenCalledWith("mainhand", "e", "SWORD_E");

    // Simulate the real round-trip: a store consuming `onSpellChange` writes
    // the auto-pick back onto `item.spells.e`, then re-renders with a brand
    // new (but value-equal) item/candidates object — as any real store
    // update would produce. The effect must recognize the selection already
    // matches and must NOT call onSpellChange again; if it did, a real store
    // wired this way would loop forever.
    rerender(
      <SlotCard
        slot="mainhand"
        item={equipped({ spells: { q: null, w: null, e: "SWORD_E", passive: null } })}
        spellCandidatesByGroup={{ e: SWORD_E_CANDIDATE }}
        onRequestItemPick={onRequestItemPick}
        onSpellChange={onSpellChange}
      />
    );

    expect(onSpellChange).toHaveBeenCalledTimes(1);
  });
});
