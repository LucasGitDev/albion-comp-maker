import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlotGrid } from "@/components/editor/SlotGrid";
import { createEmptyBuild } from "@/types/build";

/**
 * ACM-041: below `md` the grid is `grid-cols-2` (2-up); at `md+` it degrades
 * back to `flex flex-col` per group, byte-identical to the pre-existing
 * desktop markup (doc-005 §6). Both classes are asserted together — jsdom
 * has no real viewport, so this is a structural/class assertion, not a
 * rendered-pixel one.
 */
describe("SlotGrid responsive layout (ACM-041)", () => {
  it("each group wraps its cards in a 2-col grid below md and a flex column at md+", () => {
    const { container } = render(
      <SlotGrid build={createEmptyBuild()} onRequestItemPick={vi.fn()} onClearSlot={vi.fn()} />
    );
    const groupWrappers = container.querySelectorAll('[class*="grid-cols-2"]');
    expect(groupWrappers.length).toBeGreaterThan(0);
    for (const wrapper of groupWrappers) {
      expect(wrapper.className).toContain("grid-cols-2");
      expect(wrapper.className).toContain("md:flex");
      expect(wrapper.className).toContain("md:flex-col");
    }
  });

  it("the outer group container is a single column below md and flex-wrap at md+ (desktop unchanged)", () => {
    const { container } = render(
      <SlotGrid build={createEmptyBuild()} onRequestItemPick={vi.fn()} onClearSlot={vi.fn()} />
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer.className).toContain("flex-col");
    expect(outer.className).toContain("md:flex-row");
    expect(outer.className).toContain("md:flex-wrap");
  });

  it("gives each group heading a stable id and scroll-margin-top tied to --group-nav-h", () => {
    const { container } = render(
      <SlotGrid build={createEmptyBuild()} onRequestItemPick={vi.fn()} onClearSlot={vi.fn()} />
    );
    const heading = container.querySelector("#slot-group-armas") as HTMLElement;
    expect(heading).not.toBeNull();
    expect(heading.tabIndex).toBe(-1);
    expect(heading.className).toContain("scroll-mt-[var(--group-nav-h)]");
  });
});
