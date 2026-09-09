import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddBuildDialog } from "@/components/comp/AddBuildDialog";
import type { MyBuildOption } from "@/components/comp/CompBuildsManager";

const BUILDS: MyBuildOption[] = [
  { id: "b1", name: "Fire Staff Carry", role: "dps", slug: "fire-staff-carry-abc", isPublic: false },
  { id: "b2", name: "No Role Build", role: null, slug: "no-role-build-def", isPublic: false },
];

describe("AddBuildDialog", () => {
  it("renders an empty state when the user has no builds", () => {
    render(<AddBuildDialog builds={[]} disabled={false} onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/ainda não tem nenhuma build/i)).toBeInTheDocument();
  });

  it("lists builds and falls back to 'Sem papel' when role is null", () => {
    render(<AddBuildDialog builds={BUILDS} disabled={false} onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Fire Staff Carry")).toBeInTheDocument();
    expect(screen.getByText("dps")).toBeInTheDocument();
    expect(screen.getByText("Sem papel")).toBeInTheDocument();
  });

  it("calls onSelect with the chosen build", () => {
    const onSelect = vi.fn();
    render(<AddBuildDialog builds={BUILDS} disabled={false} onSelect={onSelect} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Fire Staff Carry"));
    expect(onSelect).toHaveBeenCalledWith(BUILDS[0]);
  });

  it("disables the build buttons while disabled=true", () => {
    render(<AddBuildDialog builds={BUILDS} disabled onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Fire Staff Carry").closest("button")).toBeDisabled();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<AddBuildDialog builds={BUILDS} disabled={false} onSelect={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on close button click", () => {
    const onClose = vi.fn();
    render(<AddBuildDialog builds={BUILDS} disabled={false} onSelect={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Fechar"));
    expect(onClose).toHaveBeenCalled();
  });

  it("traps focus: Tab from the last focusable element wraps to the first", () => {
    render(<AddBuildDialog builds={BUILDS} disabled={false} onSelect={vi.fn()} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    const link = screen.getByRole("link", { name: /criar nova build/i });
    link.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("traps focus: Shift+Tab from the first focusable element wraps to the last", () => {
    render(<AddBuildDialog builds={BUILDS} disabled={false} onSelect={vi.fn()} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    const closeButton = screen.getByLabelText("Fechar");
    closeButton.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("restores focus to the previously focused element on unmount", () => {
    const trigger = document.createElement("button");
    trigger.textContent = "Adicionar";
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount } = render(
      <AddBuildDialog builds={BUILDS} disabled={false} onSelect={vi.fn()} onClose={vi.fn()} />,
    );
    expect(document.activeElement).not.toBe(trigger);

    unmount();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("ignores keys other than Escape/Tab", () => {
    const onClose = vi.fn();
    render(<AddBuildDialog builds={BUILDS} disabled={false} onSelect={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(document, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
