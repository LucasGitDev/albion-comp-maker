import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpellPicker } from "@/components/editor/SpellPicker";
import type { SpellCandidate } from "@/components/editor/spell-groups";

/** Real spell ids (T4_ARMOR_PLATE_SET3's Q/passive candidates from the ao-corpus fixture). */
const Q_CANDIDATES: SpellCandidate[] = [
  { uniquename: "OUTOFCOMBATHEAL", name: "Out of Combat Heal" },
  { uniquename: "TAUNT", name: "Taunt" },
];
const PASSIVE_CANDIDATES: SpellCandidate[] = [
  { uniquename: "PASSIVE_ARMOR_MR_AR", name: "Armor Resistance" },
];

describe("SpellPicker (ACM-010)", () => {
  it("AC #2/#3: renders a row only for groups with candidates, skipping W and E entirely", () => {
    render(
      <SpellPicker
        itemName="Guardian Armor"
        selected={{ q: null, w: null, e: null, passive: null }}
        candidatesByGroup={{ q: Q_CANDIDATES, passive: PASSIVE_CANDIDATES }}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByTestId("spell-group-q")).toBeInTheDocument();
    expect(screen.getByTestId("spell-group-passive")).toBeInTheDocument();
    expect(screen.queryByTestId("spell-group-w")).toBeNull();
    expect(screen.queryByTestId("spell-group-e")).toBeNull();
  });

  it("renders nothing when the item exposes no spells at all (e.g. an offhand, decision-005)", () => {
    const { container } = render(
      <SpellPicker
        itemName="Any Offhand"
        selected={{ q: null, w: null, e: null, passive: null }}
        candidatesByGroup={{}}
        onSelect={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("AC #4: tooltip (title) shows the spell name in the active locale", () => {
    render(
      <SpellPicker
        itemName="Guardian Armor"
        selected={{ q: null, w: null, e: null, passive: null }}
        candidatesByGroup={{ q: Q_CANDIDATES }}
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByTitle("Taunt")).toBeInTheDocument();
    expect(screen.getByTitle("Out of Combat Heal")).toBeInTheDocument();
  });

  it("AC #5: uses SpellIcon per chip (icon status attribute present)", () => {
    render(
      <SpellPicker
        itemName="Guardian Armor"
        selected={{ q: "TAUNT", w: null, e: null, passive: null }}
        candidatesByGroup={{ q: Q_CANDIDATES }}
        onSelect={vi.fn()}
      />
    );
    const icons = document.querySelectorAll("[data-icon-status]");
    expect(icons.length).toBe(Q_CANDIDATES.length);
  });

  it("selecting a chip calls onSelect with its uniquename; selecting the already-selected chip clears it", () => {
    const onSelect = vi.fn();
    render(
      <SpellPicker
        itemName="Guardian Armor"
        selected={{ q: "TAUNT", w: null, e: null, passive: null }}
        candidatesByGroup={{ q: Q_CANDIDATES }}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByTitle("Out of Combat Heal"));
    expect(onSelect).toHaveBeenCalledWith("q", "OUTOFCOMBATHEAL");

    fireEvent.click(screen.getByTitle("Taunt"));
    expect(onSelect).toHaveBeenCalledWith("q", null);
  });

  it("only ever offers candidates the item itself exposes — no spell option outside candidatesByGroup", () => {
    render(
      <SpellPicker
        itemName="Guardian Armor"
        selected={{ q: null, w: null, e: null, passive: null }}
        candidatesByGroup={{ q: Q_CANDIDATES }}
        onSelect={vi.fn()}
      />
    );
    // Only the two supplied candidates render as buttons — no third/guessed option.
    expect(screen.getAllByRole("button")).toHaveLength(Q_CANDIDATES.length);
  });
});
