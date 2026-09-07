import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AOItem } from "@/data/ao-data.d";

vi.mock("@/components/editor/use-item-catalogue", () => {
  const items: AOItem[] = [
    {
      uniquename: "T4_HEAD_PLATE_SET1",
      slot: "head",
      localizedNames: { "en-US": "Soldier Helmet" },
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
      { uniquename: "T8_2H_HAMMER", twohanded: true },
      8,
      0,
    );
    render(<NewBuildPage />);
    expect(screen.getByText("Ocupada por arma de duas mãos")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
      { uniquename: "T8_2H_HAMMER", twohanded: true },
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
      { uniquename: "T8_2H_HAMMER", twohanded: true },
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
