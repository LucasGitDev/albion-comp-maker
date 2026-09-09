import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPush, mockUpdateComp, mockDeleteComp, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockUpdateComp: vi.fn(),
  mockDeleteComp: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions/comps", () => ({
  updateComp: mockUpdateComp,
  deleteComp: mockDeleteComp,
}));

vi.mock("sonner", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { CompHeader } from "@/components/comp/CompHeader";

describe("CompHeader (ACM-113)", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockUpdateComp.mockReset();
    mockDeleteComp.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
  });

  it("renders the comp name as an h1", () => {
    render(<CompHeader compId="comp-1" initialName="ZvZ Comp" />);
    expect(screen.getByRole("heading", { level: 1, name: "ZvZ Comp" })).toBeInTheDocument();
  });

  it("renames the comp: clicking the heading, editing, and pressing Enter calls updateComp with the new name", async () => {
    mockUpdateComp.mockResolvedValue({ id: "comp-1", name: "New Name" });

    render(<CompHeader compId="comp-1" initialName="Old Name" />);

    fireEvent.click(screen.getByRole("heading", { level: 1, name: "Old Name" }));

    const input = screen.getByDisplayValue("Old Name");
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await vi.waitFor(() => {
      expect(mockUpdateComp).toHaveBeenCalledWith({ id: "comp-1", name: "New Name" });
    });

    expect(screen.getByRole("heading", { level: 1, name: "New Name" })).toBeInTheDocument();
  });

  it("reverts the name when updateComp fails", async () => {
    mockUpdateComp.mockRejectedValue(new Error("boom"));

    render(<CompHeader compId="comp-1" initialName="Old Name" />);

    fireEvent.click(screen.getByRole("heading", { level: 1, name: "Old Name" }));

    const input = screen.getByDisplayValue("Old Name");
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await vi.waitFor(() => {
      expect(mockUpdateComp).toHaveBeenCalledWith({ id: "comp-1", name: "New Name" });
    });

    await vi.waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Old Name" })).toBeInTheDocument();
    });
    expect(mockToastError).toHaveBeenCalled();
  });

  it("clicking Excluir opens the confirmation dialog", () => {
    render(<CompHeader compId="comp-1" initialName="Old Name" />);

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Excluir "Old Name"\?/)).toBeInTheDocument();
  });

  it("confirming the dialog calls deleteComp with the comp id and redirects to /", async () => {
    mockDeleteComp.mockResolvedValue(undefined);

    render(<CompHeader compId="comp-1" initialName="Old Name" />);

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    const confirmButtons = screen.getAllByRole("button", { name: "Excluir" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await vi.waitFor(() => {
      expect(mockDeleteComp).toHaveBeenCalledWith("comp-1");
    });
    expect(mockPush).toHaveBeenCalledWith("/");
  });
});
