import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockDeleteComp, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockDeleteComp: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("@/actions/comps", () => ({
  deleteComp: mockDeleteComp,
}));

vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { CompsListManager, type CompListEntry } from "@/components/comp/CompsListManager";

function makeComp(overrides: Partial<CompListEntry> = {}): CompListEntry {
  return {
    id: "comp-1",
    name: "ZvZ Comp",
    contentType: "ZvZ",
    isPublic: false,
    isReachable: false,
    privateBuildCount: 0,
    ...overrides,
  };
}

describe("CompsListManager (ACM-113)", () => {
  beforeEach(() => {
    mockDeleteComp.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it("renders an Excluir button for each comp row", () => {
    render(
      <CompsListManager
        initialComps={[makeComp({ id: "comp-1", name: "Comp A" }), makeComp({ id: "comp-2", name: "Comp B" })]}
      />,
    );

    expect(screen.getAllByRole("button", { name: "Excluir" })).toHaveLength(2);
  });

  it("confirming delete calls deleteComp with the correct comp id and removes the row", async () => {
    mockDeleteComp.mockResolvedValue(undefined);

    render(
      <CompsListManager
        initialComps={[makeComp({ id: "comp-1", name: "Comp A" }), makeComp({ id: "comp-2", name: "Comp B" })]}
      />,
    );

    const [firstDeleteButton] = screen.getAllByRole("button", { name: "Excluir" });
    fireEvent.click(firstDeleteButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole("button", { name: "Excluir" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await vi.waitFor(() => {
      expect(mockDeleteComp).toHaveBeenCalledWith("comp-1");
    });

    await vi.waitFor(() => {
      expect(screen.queryByText("Comp A")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Comp B")).toBeInTheDocument();
  });

  it("shows an error toast and keeps the row when deleteComp fails", async () => {
    mockDeleteComp.mockRejectedValue(new Error("boom"));

    render(<CompsListManager initialComps={[makeComp({ id: "comp-1", name: "Comp A" })]} />);

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    const confirmButtons = screen.getAllByRole("button", { name: "Excluir" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await vi.waitFor(() => {
      expect(mockDeleteComp).toHaveBeenCalledWith("comp-1");
    });
    expect(mockToastError).toHaveBeenCalled();
    expect(screen.getByText("Comp A")).toBeInTheDocument();
  });
});
