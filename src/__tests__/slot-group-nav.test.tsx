import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SlotGroupNav } from "@/components/editor/SlotGroupNav";

const GROUPS = [
  { id: "armas", title: "Armas", filled: 1, total: 2 },
  { id: "armadura", title: "Armadura", filled: 0, total: 3 },
];

function renderNavWithTargets(props: Partial<React.ComponentProps<typeof SlotGroupNav>> = {}) {
  render(
    <div>
      <SlotGroupNav groups={GROUPS} totalFilled={1} totalSlots={9} swapsCount={0} {...props} />
      <h3 id="slot-group-armas" tabIndex={-1}>
        Armas
      </h3>
      <h3 id="slot-group-armadura" tabIndex={-1}>
        Armadura
      </h3>
      <div id="slot-group-swaps" tabIndex={-1}>
        Swaps
      </div>
    </div>
  );
}

describe("SlotGroupNav (ACM-041)", () => {
  it("renders real anchor links, one per group plus swaps, each with a visible counter", () => {
    renderNavWithTargets();
    const armas = screen.getByRole("link", { name: /armas 1 de 2/i });
    const armadura = screen.getByRole("link", { name: /armadura 0 de 3/i });
    const swaps = screen.getByRole("link", { name: /swaps 0/i });
    expect(armas).toHaveAttribute("href", "#slot-group-armas");
    expect(armadura).toHaveAttribute("href", "#slot-group-armadura");
    expect(swaps).toHaveAttribute("href", "#slot-group-swaps");
  });

  it("never uses aria-selected (no tab/tablist vocabulary introduced)", () => {
    renderNavWithTargets();
    const nav = screen.getByRole("navigation", { name: /grupos de slots/i });
    expect(nav.querySelector("[aria-selected]")).toBeNull();
    expect(nav.querySelector('[role="tab"]')).toBeNull();
    expect(nav.querySelector('[role="tablist"]')).toBeNull();
  });

  it("moves focus to the target group heading when its chip is clicked (not <body>, not nowhere)", () => {
    renderNavWithTargets();
    const chip = screen.getByRole("link", { name: /armadura 0 de 3/i });
    fireEvent.click(chip);
    const heading = document.getElementById("slot-group-armadura");
    expect(document.activeElement).toBe(heading);
    expect(document.activeElement).not.toBe(document.body);
  });

  it("moves focus to the swaps anchor wrapper when the swaps chip is clicked", () => {
    renderNavWithTargets();
    const chip = screen.getByRole("link", { name: /swaps 0/i });
    fireEvent.click(chip);
    expect(document.activeElement).toBe(document.getElementById("slot-group-swaps"));
  });

  it("updates the visible active chip to Swaps immediately on click, not just focus (visual review CRITICAL/HIGH: the chip must never stay stuck on a previous group, especially a short last section the IntersectionObserver may never flag as intersecting)", () => {
    renderNavWithTargets();
    const armadura = screen.getByRole("link", { name: /armadura 0 de 3/i });
    fireEvent.click(armadura);
    expect(armadura).toHaveAttribute("aria-current", "location");

    const swaps = screen.getByRole("link", { name: /swaps 0/i });
    fireEvent.click(swaps);
    expect(swaps).toHaveAttribute("aria-current", "location");
    expect(armadura).not.toHaveAttribute("aria-current");
  });

  it("does not render a redundant check-mark glyph for a complete group (AA contrast fail, ACM-041 visual review) — the count text already conveys completion", () => {
    renderNavWithTargets({ groups: [{ id: "armas", title: "Armas", filled: 2, total: 2 }] });
    const chip = screen.getByRole("link", { name: /armas 2 de 2/i });
    expect(chip).not.toHaveTextContent("✓");
    expect(chip).toHaveTextContent("Armas 2/2");
  });
});
