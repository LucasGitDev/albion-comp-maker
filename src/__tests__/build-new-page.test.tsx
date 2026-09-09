import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AOItem } from "@/data/ao-data.d";

vi.mock("@/components/editor/use-item-catalogue", () => {
  const items: AOItem[] = [
    {
      uniquename: "T4_HEAD_PLATE_SET1",
      slot: "head",
      localizedNames: { "EN-US": "Soldier Helmet" },
      spells: [],
      twohanded: false,
      maxEnchant: 4,
    },
    {
      uniquename: "T4_MAIN_SWORD",
      slot: "mainhand",
      localizedNames: { "EN-US": "Broadsword" },
      spells: [
        { uniquename: "SWORD_Q", slotGroup: "1", kind: "active", localizedNames: { "EN-US": "Slash" } },
        { uniquename: "SWORD_W", slotGroup: "2", kind: "active", localizedNames: { "EN-US": "Guard" } },
      ],
      twohanded: false,
      maxEnchant: 4,
    },
    {
      uniquename: "T4_BAG",
      slot: "bag",
      localizedNames: { "EN-US": "Bag" },
      spells: [],
      twohanded: false,
      maxEnchant: 0,
    },
  ];
  return { useItemCatalogue: () => ({ items, loading: false }) };
});

const { mockSaveBuild } = vi.hoisted(() => ({
  mockSaveBuild: vi.fn(),
}));

vi.mock("@/actions/builds", () => ({
  saveBuild: mockSaveBuild,
}));

import NewBuildPage from "@/app/(editor)/build/new/page";
import { useBuildStore } from "@/store/build-store";

function mockSession(authenticated: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => (authenticated ? { user: { name: "Lucas" } } : {}),
    })
  );
}

beforeEach(() => {
  useBuildStore.getState().actions.reset();
  mockSaveBuild.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("/build/new — ItemPicker wiring (ACM-034)", () => {
  it("does not show any picker UI before a slot is clicked", () => {
    render(<NewBuildPage />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the picker when an empty slot is clicked", () => {
    render(<NewBuildPage />);
    fireEvent.click(screen.getAllByText("Adicionar")[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("selecting an item writes it into the store and closes the picker", async () => {
    render(<NewBuildPage />);
    const headSlot = document.querySelector('[data-slot="head"][data-slot-state="empty"]')!;
    fireEvent.click(headSlot);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const option = await screen.findByText("Soldier Helmet");
    fireEvent.click(option);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(useBuildStore.getState().build.slots.head?.itemId).toBe("T4_HEAD_PLATE_SET1");
  });

  it("Escape closes the picker without mutating the slot", async () => {
    render(<NewBuildPage />);
    fireEvent.click(screen.getAllByText("Adicionar")[0]);
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(useBuildStore.getState().build.slots.mainhand).toBeNull();
  });

  it("clicking the backdrop closes the picker without mutating the slot", async () => {
    render(<NewBuildPage />);
    fireEvent.click(screen.getAllByText("Adicionar")[0]);
    fireEvent.click(screen.getByTestId("item-picker-backdrop"));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(useBuildStore.getState().build.slots.mainhand).toBeNull();
  });

  it("locked offhand (mainhand two-handed) never opens the picker", () => {
    useBuildStore.getState().actions.setItem(
      "mainhand",
      { uniquename: "T8_2H_HAMMER", twohanded: true, maxEnchant: 4 },
      8,
      0,
    );
    render(<NewBuildPage />);
    expect(screen.getByText("Ocupada por arma de duas mãos")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("/build/new — tier/enchant selectors are actually reachable (ACM-031 review fix)", () => {
  it("renders the enchant selector for an equipped item and changing it updates the store", async () => {
    useBuildStore.getState().actions.setItem(
      "head",
      { uniquename: "T4_HEAD_PLATE_SET1", twohanded: false, maxEnchant: 4 },
      4,
      0
    );

    render(<NewBuildPage />);

    const enchantSelect = await screen.findByRole("combobox", { name: "Encantamento de Cabeça" });
    fireEvent.change(enchantSelect, { target: { value: "3" } });

    expect(useBuildStore.getState().build.slots.head?.enchant).toBe(3);
    expect(screen.getByTestId("enchant-badge")).toHaveTextContent(".3");
  });

  it("renders the tier selector for an equipped item and changing it updates the store", async () => {
    useBuildStore.getState().actions.setItem(
      "head",
      { uniquename: "T4_HEAD_PLATE_SET1", twohanded: false, maxEnchant: 4 },
      4,
      0
    );

    render(<NewBuildPage />);

    // The mocked catalogue only carries T4_HEAD_PLATE_SET1, so the tier
    // selector has a single option, but its mere presence proves
    // `tierOptionsBySlot` is wired through from the live route (the bug
    // this test guards against is the prop never reaching `SlotGrid` at
    // all, per the review finding).
    const tierSelect = await screen.findByRole("combobox", { name: "Tier de Cabeça" });
    expect(tierSelect).toBeInTheDocument();
  });

  it("does not render either selector for a slot with no options (empty slot)", () => {
    render(<NewBuildPage />);
    expect(screen.queryByRole("combobox", { name: /Encantamento de/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /Tier de/ })).not.toBeInTheDocument();
  });
});

describe("/build/new — Salvar persists via the real saveBuild Server Action (ACM-037 review fix)", () => {
  it("calls saveBuild with the current build's name, role and serialized content", async () => {
    mockSession(true);
    mockSaveBuild.mockResolvedValue({ id: "b1" });
    useBuildStore.getState().actions.setName("Bruiser de Frontline");
    useBuildStore.getState().actions.setRole("Tank");
    useBuildStore.getState().actions.setItem(
      "mainhand",
      { uniquename: "T8_2H_HAMMER", twohanded: true, maxEnchant: 4 },
      8,
      0
    );

    render(<NewBuildPage />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mockSaveBuild).toHaveBeenCalledTimes(1));

    const [payload] = mockSaveBuild.mock.calls[0] as [{ name: string; role: string | null; content: string }];
    expect(payload.name).toBe("Bruiser de Frontline");
    expect(payload.role).toBe("Tank");
    expect(JSON.parse(payload.content)).toMatchObject({
      name: "Bruiser de Frontline",
      slots: { mainhand: { itemId: "T8_2H_HAMMER" } },
    });

    // This assertion fails against a no-op `handleSave`: the previous
    // implementation resolved without ever calling `saveBuild`, so
    // "Build salva." rendered without anything actually persisted.
    expect(await screen.findByText("Build salva.")).toBeInTheDocument();
  });

  it("surfaces the real saveBuild failure instead of always reporting success", async () => {
    mockSession(true);
    mockSaveBuild.mockRejectedValue(new Error("boom"));
    useBuildStore.getState().actions.setName("Bruiser de Frontline");
    useBuildStore.getState().actions.setItem(
      "mainhand",
      { uniquename: "T8_2H_HAMMER", twohanded: true, maxEnchant: 4 },
      8,
      0
    );

    render(<NewBuildPage />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mockSaveBuild).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Não deu para salvar.")).toBeInTheDocument();
    expect(screen.queryByText("Build salva.")).not.toBeInTheDocument();
  });
});

describe("/build/new — main slot grid shows ability slots and item names (ACM-040)", () => {
  it("renders the spell picker with a row per group for a weapon equipped in the mainhand slot", () => {
    useBuildStore.getState().actions.setItem(
      "mainhand",
      { uniquename: "T4_MAIN_SWORD", twohanded: false, maxEnchant: 4 },
      4,
      0
    );

    render(<NewBuildPage />);

    const mainhandCard = document.querySelector('[data-slot="mainhand"]')!;
    expect(mainhandCard.querySelector('[data-testid="spell-picker"]')).toBeInTheDocument();
    expect(mainhandCard.querySelector('[data-testid="spell-group-q"]')).toBeInTheDocument();
    expect(mainhandCard.querySelector('[data-testid="spell-group-w"]')).toBeInTheDocument();
    expect(mainhandCard.querySelector('[data-testid="spell-group-e"]')).not.toBeInTheDocument();
  });

  it("renders the spell picker only for the slot whose item has spells, and the empty state for the one that doesn't", () => {
    useBuildStore.getState().actions.setItem(
      "mainhand",
      { uniquename: "T4_MAIN_SWORD", twohanded: false, maxEnchant: 4 },
      4,
      0
    );
    useBuildStore.getState().actions.setItem("bag", { uniquename: "T4_BAG", twohanded: false, maxEnchant: 0 }, 4, 0);

    render(<NewBuildPage />);

    // Scoped to `[data-testid="slot-grid"]` so this doesn't accidentally
    // match the read-only build-card preview tile, which shares the same
    // `data-slot`/`data-slot-state` attributes (ACM-092 added the latter to
    // the preview tile too) but never renders a spell picker of any kind.
    const slotGrid = document.querySelector('[data-testid="slot-grid"]')!;
    const mainhandCard = slotGrid.querySelector('[data-slot="mainhand"]')!;
    expect(mainhandCard.querySelector('[data-testid="spell-picker"]')).toBeInTheDocument();
    expect(mainhandCard.querySelector('[data-testid="spell-picker-empty"]')).not.toBeInTheDocument();

    const bagCard = slotGrid.querySelector('[data-slot="bag"]')!;
    expect(bagCard.querySelector('[data-testid="spell-picker"]')).not.toBeInTheDocument();
    expect(bagCard.querySelector('[data-testid="spell-picker-empty"]')).toBeInTheDocument();
  });

  it("shows the localized item name on the slot card instead of the raw uniquename", () => {
    useBuildStore.getState().actions.setItem(
      "mainhand",
      { uniquename: "T4_MAIN_SWORD", twohanded: false, maxEnchant: 4 },
      4,
      0
    );

    render(<NewBuildPage />);

    const mainhandCard = document.querySelector('[data-slot="mainhand"]')!;
    expect(mainhandCard).toHaveTextContent("Broadsword");
    expect(mainhandCard).not.toHaveTextContent("T4_MAIN_SWORD");
  });
});

describe("/build/new — Swaps section (ACM-012, RF-3)", () => {
  it("renders the empty state and adding a swap via the real route reaches the store", () => {
    render(<NewBuildPage />);

    expect(screen.getByText("Nenhum swap definido")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Adicionar swap" }));

    expect(screen.queryByText("Nenhum swap definido")).not.toBeInTheDocument();
    expect(useBuildStore.getState().build.swaps).toHaveLength(1);
    expect(screen.getAllByTestId("swap-row")).toHaveLength(1);
  });

  it("picking an item for a swap through the real ItemPicker writes it into the swap's slot", async () => {
    render(<NewBuildPage />);
    fireEvent.click(screen.getByRole("button", { name: "+ Adicionar swap" }));

    // The mocked catalogue only carries a head-slot item, so point the swap
    // at "Cabeça" before opening the picker — the picker itself filters by
    // slot the same way the main slot grid does.
    fireEvent.change(screen.getByRole("combobox", { name: "Slot do swap 1" }), { target: { value: "head" } });

    fireEvent.click(screen.getByRole("button", { name: /Escolher item alternativo/ }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const option = await screen.findByText("Soldier Helmet");
    fireEvent.click(option);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const [swap] = useBuildStore.getState().build.swaps;
    expect(swap.slots.head?.itemId).toBe("T4_HEAD_PLATE_SET1");
  });

  it("editing the label of a swap on the real route writes it into the store", () => {
    render(<NewBuildPage />);
    fireEvent.click(screen.getByRole("button", { name: "+ Adicionar swap" }));

    const [swap] = useBuildStore.getState().build.swaps;
    const labelInput = screen.getByRole("textbox", { name: `Rótulo do swap 1` });
    fireEvent.change(labelInput, { target: { value: "Bridge fight" } });

    expect(useBuildStore.getState().build.swaps.find((s) => s.id === swap.id)?.label).toBe("Bridge fight");
  });

  it("removing a swap on the real route removes it from the store", () => {
    render(<NewBuildPage />);
    fireEvent.click(screen.getByRole("button", { name: "+ Adicionar swap" }));
    expect(useBuildStore.getState().build.swaps).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Remover swap 1" }));

    expect(useBuildStore.getState().build.swaps).toHaveLength(0);
    expect(screen.getByText("Nenhum swap definido")).toBeInTheDocument();
  });

  it("reordering swaps on the real route is stable with no duplicate/gapped positions, including the boundary cases", () => {
    render(<NewBuildPage />);
    const addButton = screen.getByRole("button", { name: "+ Adicionar swap" });
    fireEvent.click(addButton);
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    const [first, second, third] = useBuildStore.getState().build.swaps;
    useBuildStore.getState().actions.setSwapLabel(first.id, "First");
    useBuildStore.getState().actions.setSwapLabel(second.id, "Second");
    useBuildStore.getState().actions.setSwapLabel(third.id, "Third");

    // Boundary: moving the first item's "up" button is a no-op.
    fireEvent.click(screen.getByRole("button", { name: "Mover swap 1 para cima" }));
    expect(useBuildStore.getState().build.swaps.map((s) => s.label)).toEqual(["First", "Second", "Third"]);

    // Move the first item down: First and Second swap places.
    fireEvent.click(screen.getByRole("button", { name: "Mover swap 1 para baixo" }));
    expect(useBuildStore.getState().build.swaps.map((s) => s.label)).toEqual(["Second", "First", "Third"]);

    // Boundary: moving the last item's "down" button is a no-op.
    fireEvent.click(screen.getByRole("button", { name: "Mover swap 3 para baixo" }));
    expect(useBuildStore.getState().build.swaps.map((s) => s.label)).toEqual(["Second", "First", "Third"]);

    // Move the last item up: First and Third swap places.
    fireEvent.click(screen.getByRole("button", { name: "Mover swap 3 para cima" }));
    expect(useBuildStore.getState().build.swaps.map((s) => s.label)).toEqual(["Second", "Third", "First"]);

    const ids = useBuildStore.getState().build.swaps.map((s) => s.id);
    expect(new Set(ids).size).toBe(3);
  });

  it("saving succeeds when a swap is added and never touched (ACM-012 review round 3: swapSchema.label allows '', so no onBlur is required before Salvar)", async () => {
    mockSession(true);
    mockSaveBuild.mockResolvedValue({ id: "b1" });
    useBuildStore.getState().actions.setName("Bruiser de Frontline");
    useBuildStore.getState().actions.setItem(
      "mainhand",
      { uniquename: "T8_2H_HAMMER", twohanded: true, maxEnchant: 4 },
      8,
      0
    );

    render(<NewBuildPage />);

    // Add a swap and never focus/blur its label input.
    fireEvent.click(screen.getByRole("button", { name: "+ Adicionar swap" }));
    expect(useBuildStore.getState().build.swaps[0].label).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(mockSaveBuild).toHaveBeenCalledTimes(1));
    const [payload] = mockSaveBuild.mock.calls[0] as [{ content: string }];
    expect(JSON.parse(payload.content).swaps[0].label).toBe("");
    expect(await screen.findByText("Build salva.")).toBeInTheDocument();
    expect(screen.queryByText("Não deu para salvar.")).not.toBeInTheDocument();
  });
});
