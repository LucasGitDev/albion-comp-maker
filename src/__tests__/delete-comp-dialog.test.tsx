import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeleteCompDialog } from "@/components/comp/DeleteCompDialog";

describe("DeleteCompDialog (ACM-113)", () => {
  it("renders the comp name and calls onConfirm when Excluir is clicked", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(<DeleteCompDialog compName="ZvZ Comp" pending={false} onConfirm={onConfirm} onClose={onClose} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Excluir "ZvZ Comp"\?/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cancelar is clicked or Escape is pressed", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(<DeleteCompDialog compName="ZvZ Comp" pending={false} onConfirm={onConfirm} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("disables both buttons while pending", () => {
    render(<DeleteCompDialog compName="ZvZ Comp" pending={true} onConfirm={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Excluindo…" })).toBeDisabled();
  });
});
