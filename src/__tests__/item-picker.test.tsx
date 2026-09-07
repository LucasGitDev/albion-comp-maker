import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AOItem } from "@/data/ao-data.d";
import { ItemPicker } from "@/components/item-picker/ItemPicker";

function item(overrides: Partial<AOItem> & { uniquename: string; slot: AOItem["slot"] }): AOItem {
  return {
    localizedNames: {},
    spells: [],
    twohanded: false,
    ...overrides,
  };
}

const ITEMS: AOItem[] = [
  item({
    uniquename: "T4_MAIN_SWORD",
    slot: "mainhand",
    localizedNames: { "en-US": "Broadsword", "pt-BR": "Espadão" },
  }),
  item({
    uniquename: "T8_2H_HAMMER",
    slot: "mainhand",
    twohanded: true,
    localizedNames: { "en-US": "Sacred Hammer", "pt-BR": "Martelo Sagrado" },
  }),
  item({
    uniquename: "T1_OFF_SHIELD",
    slot: "offhand",
    localizedNames: { "en-US": "Shield", "pt-BR": "Escudo" },
  }),
];

describe("ItemPicker", () => {
  it("exposes a combobox with listbox aria wiring", () => {
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("filters results by the fixed slot prop, never showing other-slot items", () => {
    render(<ItemPicker slot="offhand" items={ITEMS} onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Shield")).toBeInTheDocument();
    expect(screen.queryByText("Broadsword")).not.toBeInTheDocument();
  });

  it("shows the ItemIcon and tier chip for each result row", () => {
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("T8")).toBeInTheDocument();
    expect(screen.getByText("2H")).toBeInTheDocument();
    const icons = document.querySelectorAll("img");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("moves the active option down and up with the arrow keys and reflects it via aria-activedescendant", () => {
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByRole("combobox");

    // Empty query, tier-desc order: T8 (tier 8) sorts before T4 (tier 4).
    expect(input).toHaveAttribute("aria-activedescendant", "ip-opt-T8_2H_HAMMER");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "ip-opt-T4_MAIN_SWORD");

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input).toHaveAttribute("aria-activedescendant", "ip-opt-T8_2H_HAMMER");
  });

  it("selects the active option on Enter", () => {
    const onSelect = vi.fn();
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={onSelect} onClose={vi.fn()} />);
    const input = screen.getByRole("combobox");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].uniquename).toBe("T4_MAIN_SWORD");
  });

  it("clears a non-empty query on Escape without closing, and closes on a second Escape", () => {
    const onClose = vi.fn();
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={vi.fn()} onClose={onClose} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "hammer" } });
    expect(input.value).toBe("hammer");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("");
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("debounces the query before filtering results", async () => {
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "hammer" } });
    // Immediately after typing, the previous (unfiltered) list is still shown.
    expect(screen.getByText("Broadsword")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Broadsword")).not.toBeInTheDocument();
    });
    // Full text asserted via textContent (not the default text-node-only
    // matcher) because ACM-028 wraps the matched substring in <mark>,
    // splitting "Sacred Hammer" across sibling nodes.
    expect(
      screen.getByText((_, element) => element?.textContent === "Sacred Hammer")
    ).toBeInTheDocument();
  });
});
