import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AOItem } from "@/data/ao-data.d";
import { ItemPicker } from "@/components/item-picker/ItemPicker";

function item(overrides: Partial<AOItem> & { uniquename: string; slot: AOItem["slot"] }): AOItem {
  return {
    localizedNames: {},
    spells: [],
    twohanded: false,
    maxEnchant: 0,
    ...overrides,
  };
}

const ITEMS: AOItem[] = [
  item({
    uniquename: "T4_MAIN_SWORD",
    slot: "mainhand",
    localizedNames: { "EN-US": "Broadsword", "PT-BR": "Espadão" },
  }),
  item({
    uniquename: "T8_2H_HAMMER",
    slot: "mainhand",
    twohanded: true,
    localizedNames: { "EN-US": "Sacred Hammer", "PT-BR": "Martelo Sagrado" },
  }),
  item({
    uniquename: "T1_OFF_SHIELD",
    slot: "offhand",
    localizedNames: { "EN-US": "Shield", "PT-BR": "Escudo" },
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
    // DEFAULT_LOCALE is pt-BR (ACM-093 visual-review fix), so with no
    // locale prop/context the picker falls back to the pt-BR name.
    expect(screen.getByText("Escudo")).toBeInTheDocument();
    expect(screen.queryByText("Espadão")).not.toBeInTheDocument();
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

  it("regression (ACM-046): selects the active option on Tab and prevents the native Tab from firing (non-empty catalogue)", () => {
    const onSelect = vi.fn();
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={onSelect} onClose={vi.fn()} />);
    const input = screen.getByRole("combobox");

    // Empty query, tier-desc order: T8 (tier 8) is highlighted by default,
    // so this exercises the bug's reachable path (a real highlighted
    // result), not the previously-masked always-empty-catalogue case.
    const event = fireEvent.keyDown(input, { key: "Tab" });

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].uniquename).toBe("T8_2H_HAMMER");
    // fireEvent.keyDown returns false when preventDefault() was called.
    expect(event).toBe(false);
  });

  it("does not call preventDefault on Tab when there is no highlighted result to commit", () => {
    const onSelect = vi.fn();
    render(<ItemPicker slot="mainhand" items={[]} onSelect={onSelect} onClose={vi.fn()} />);
    const input = screen.getByRole("combobox");

    const event = fireEvent.keyDown(input, { key: "Tab" });

    expect(onSelect).not.toHaveBeenCalled();
    expect(event).toBe(true);
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

  it("jumps the active option with PageDown/PageUp", () => {
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByRole("combobox");

    fireEvent.keyDown(input, { key: "PageDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "ip-opt-T4_MAIN_SWORD");

    fireEvent.keyDown(input, { key: "PageUp" });
    expect(input).toHaveAttribute("aria-activedescendant", "ip-opt-T8_2H_HAMMER");
  });

  it("Home/End jump to the first/last option only when the query is empty", () => {
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByRole("combobox");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "ip-opt-T4_MAIN_SWORD");

    fireEvent.keyDown(input, { key: "Home" });
    expect(input).toHaveAttribute("aria-activedescendant", "ip-opt-T8_2H_HAMMER");

    fireEvent.keyDown(input, { key: "End" });
    expect(input).toHaveAttribute("aria-activedescendant", "ip-opt-T4_MAIN_SWORD");
  });

  it("Home/End are no-ops while the query is non-empty (native text-cursor behavior wins)", () => {
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hammer" } });

    const homeEvent = fireEvent.keyDown(input, { key: "Home" });
    const endEvent = fireEvent.keyDown(input, { key: "End" });

    expect(homeEvent).toBe(true);
    expect(endEvent).toBe(true);
  });

  it("closes on Backspace when the query is already empty", () => {
    const onClose = vi.fn();
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={vi.fn()} onClose={onClose} />);
    const input = screen.getByRole("combobox");

    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close on Backspace while the query is non-empty", () => {
    const onClose = vi.fn();
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={vi.fn()} onClose={onClose} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hammer" } });

    fireEvent.keyDown(input, { key: "Backspace" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores keys with no dedicated handler", () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={onSelect} onClose={onClose} />);
    const input = screen.getByRole("combobox");

    fireEvent.keyDown(input, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("debounces the query before filtering results", async () => {
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "hammer" } });
    // Immediately after typing, the previous (unfiltered) list is still
    // shown. DEFAULT_LOCALE is pt-BR (ACM-093 visual-review fix), so with
    // no locale prop/context the picker falls back to pt-BR names.
    expect(screen.getByText("Espadão")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("Espadão")).not.toBeInTheDocument();
    });
    // Full text asserted via textContent (not the default text-node-only
    // matcher) because ACM-028 wraps the matched substring in <mark>,
    // splitting "Martelo Sagrado" across sibling nodes.
    expect(
      screen.getByText((_, element) => element?.textContent === "Martelo Sagrado")
    ).toBeInTheDocument();
  });
});
