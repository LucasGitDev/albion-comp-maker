import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

import NewBuildPage from "@/app/(editor)/build/new/page";
import { useBuildStore } from "@/store/build-store";

beforeEach(() => {
  useBuildStore.getState().actions.reset();
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
