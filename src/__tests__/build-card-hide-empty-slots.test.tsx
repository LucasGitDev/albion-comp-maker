import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BuildCard } from "@/components/build-card";
import { createEmptyBuild, type BuildState } from "@/types/build";

function partiallyFilledBuild(): BuildState {
  const state = createEmptyBuild();
  state.name = "Bruiser de Frontline";
  state.role = "Tank";
  state.slots.head = {
    itemId: "T8_HEAD_PLATE_SET1",
    tier: 8,
    enchant: 0,
    spells: { q: null, w: "HEAD_W", e: null, passive: null },
    twohanded: false,
    maxEnchant: 4,
  };
  return state;
}

/**
 * ACM-122: `hideEmptySlots` must omit every empty-slot placeholder (both the
 * `CardSlotTile`-rendered equipment slots and the special-cased mainhand
 * block) while leaving filled slots untouched, for both share-page layouts
 * reachable by a real route (`vertical` on `/build/[id]`, `grid` on
 * `/comp/[slug]`).
 */
describe("BuildCard hideEmptySlots (ACM-122)", () => {
  it("omits empty slots in the vertical layout when hideEmptySlots is set", () => {
    const { container } = render(
      <BuildCard state={partiallyFilledBuild()} layout="vertical" hideEmptySlots />
    );
    expect(container.querySelectorAll('[data-slot-state="empty"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-slot-state="filled"]')).toHaveLength(1);
  });

  it("keeps rendering empty slots in the vertical layout by default (editor preview, ACM-092)", () => {
    const { container } = render(<BuildCard state={partiallyFilledBuild()} layout="vertical" />);
    expect(container.querySelectorAll('[data-slot-state="empty"]').length).toBeGreaterThan(0);
  });

  it("omits empty slots in the grid layout when hideEmptySlots is set", () => {
    const { container } = render(
      <BuildCard state={partiallyFilledBuild()} layout="grid" hideEmptySlots />
    );
    expect(container.querySelectorAll('[data-slot-state="empty"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-slot-state="filled"]')).toHaveLength(1);
  });

  it("keeps rendering empty slots in the grid layout by default", () => {
    const { container } = render(<BuildCard state={partiallyFilledBuild()} layout="grid" />);
    expect(container.querySelectorAll('[data-slot-state="empty"]').length).toBeGreaterThan(0);
  });
});
