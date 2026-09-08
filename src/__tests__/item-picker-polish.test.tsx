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

describe("ItemPicker — aria-selected (value prop)", () => {
  it("marks the equipped row aria-selected=true and all others false", () => {
    render(
      <ItemPicker
        slot="mainhand"
        items={ITEMS}
        value="T4_MAIN_SWORD"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const equipped = document.getElementById("ip-opt-T4_MAIN_SWORD");
    const other = document.getElementById("ip-opt-T8_2H_HAMMER");
    expect(equipped).toHaveAttribute("aria-selected", "true");
    expect(other).toHaveAttribute("aria-selected", "false");
  });

  it("keeps the keyboard-highlighted row distinct from aria-selected unless it is also equipped", () => {
    render(
      <ItemPicker
        slot="mainhand"
        items={ITEMS}
        value="T4_MAIN_SWORD"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const input = screen.getByRole("combobox");

    // Initial highlight (tier-desc, index 0) is T8_2H_HAMMER, not the equipped item.
    expect(input).toHaveAttribute("aria-activedescendant", "ip-opt-T8_2H_HAMMER");
    const highlighted = document.getElementById("ip-opt-T8_2H_HAMMER");
    expect(highlighted).toHaveAttribute("aria-selected", "false");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", "ip-opt-T4_MAIN_SWORD");
    // Now the highlighted row is also the equipped row: aria-selected true.
    const equippedAndHighlighted = document.getElementById("ip-opt-T4_MAIN_SWORD");
    expect(equippedAndHighlighted).toHaveAttribute("aria-selected", "true");
  });

  it("defaults value to null and keeps every row aria-selected=false", () => {
    render(<ItemPicker slot="mainhand" items={ITEMS} onSelect={vi.fn()} onClose={vi.fn()} />);
    for (const li of document.querySelectorAll("li[role='option']")) {
      expect(li).toHaveAttribute("aria-selected", "false");
    }
  });
});

describe("ItemPicker — cross-locale secondary name", () => {
  it("shows the non-active-locale matched name as muted secondary text", async () => {
    render(
      <ItemPicker
        slot="mainhand"
        items={ITEMS}
        locale="en-US"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const input = screen.getByRole("combobox");

    // "sagrado" only matches the pt-BR name of Sacred Hammer.
    fireEvent.change(input, { target: { value: "sagrado" } });

    await waitFor(() => {
      expect(
        screen.getByText((_, element) => (element?.textContent ?? "") === "· Martelo Sagrado")
      ).toBeInTheDocument();
    });
    // Primary (active-locale) name is still shown too.
    expect(
      screen.getByText((_, el) => (el?.textContent ?? "") === "Sacred Hammer")
    ).toBeInTheDocument();
  });

  it("does not show a secondary name when the match came from the active locale", async () => {
    render(
      <ItemPicker
        slot="mainhand"
        items={ITEMS}
        locale="en-US"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "hammer" } });

    await waitFor(() => {
      expect(screen.queryByText("Martelo Sagrado")).not.toBeInTheDocument();
    });
  });
});

describe("ItemPicker — <mark> substring highlighting", () => {
  it("wraps the matched query token in a <mark> element, first occurrence only", async () => {
    render(
      <ItemPicker
        slot="mainhand"
        items={ITEMS}
        locale="en-US"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "hammer" } });

    await waitFor(() => {
      const marks = document.querySelectorAll("mark");
      expect(marks.length).toBe(1);
      expect(marks[0].textContent).toBe("Hammer");
    });
  });

  it("does not break on regex-special characters in the query", async () => {
    const specialItems: AOItem[] = [
      item({
        uniquename: "T4_MAIN_SPECIAL",
        slot: "mainhand",
        localizedNames: { "EN-US": "Fire(Staff)", "PT-BR": "Cajado de Fogo" },
      }),
    ];
    render(
      <ItemPicker
        slot="mainhand"
        items={specialItems}
        locale="en-US"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const input = screen.getByRole("combobox");
    expect(() => fireEvent.change(input, { target: { value: "(staff)" } })).not.toThrow();

    await waitFor(() => {
      expect(
        screen.getByText((_, element) => element?.textContent === "Fire(Staff)")
      ).toBeInTheDocument();
    });
  });
});

describe("ItemPicker — result virtualization (>40 results)", () => {
  function buildManyItems(count: number): AOItem[] {
    return Array.from({ length: count }, (_, i) =>
      item({
        uniquename: `T4_MAIN_ITEM_${i}`,
        slot: "mainhand",
        localizedNames: { "EN-US": `Sword ${i}`, "PT-BR": `Espada ${i}` },
      })
    );
  }

  it("renders only a windowed subset of <li> option rows while preserving aria-setsize/aria-posinset", () => {
    const items = buildManyItems(60);
    render(<ItemPicker slot="mainhand" items={items} onSelect={vi.fn()} onClose={vi.fn()} />);

    const rows = document.querySelectorAll("li[role='option']");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(60);

    for (const row of rows) {
      expect(row).toHaveAttribute("aria-setsize", "60");
      const posinset = Number(row.getAttribute("aria-posinset"));
      expect(posinset).toBeGreaterThanOrEqual(1);
      expect(posinset).toBeLessThanOrEqual(60);
    }
  });

  it("does not virtualize when results.length <= 40", () => {
    const items = buildManyItems(40);
    render(<ItemPicker slot="mainhand" items={items} onSelect={vi.fn()} onClose={vi.fn()} />);
    const rows = document.querySelectorAll("li[role='option']");
    expect(rows.length).toBe(40);
  });
});
