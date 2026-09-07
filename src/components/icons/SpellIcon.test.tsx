import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpellIcon } from "./SpellIcon";

function getImg(container: HTMLElement): HTMLImageElement {
  const img = container.querySelector("img");
  if (!img) throw new Error("expected <img> to be in the DOM");
  return img as HTMLImageElement;
}

describe("SpellIcon", () => {
  it("renders the spell proxy URL", () => {
    const { container } = render(
      <SpellIcon sprite="HOLYSTAFF_HEAL_ALL" alt="Cura em Área" />
    );
    const img = getImg(container);
    expect(img.getAttribute("src")).toBe(
      "/api/icon?type=spell&id=HOLYSTAFF_HEAL_ALL"
    );
  });

  it("shows the loading fallback before the image resolves", () => {
    const { container } = render(<SpellIcon sprite="HOLYSTAFF_HEAL_ALL" alt="Cura" />);
    expect(container.querySelector('[data-icon-status="loading"]')).toBeTruthy();
  });

  it("detects the missing state via naturalWidth <= 1 on load", () => {
    const { container } = render(<SpellIcon sprite="HOLYSTAFF_HEAL_ALL" alt="Cura" />);
    const img = getImg(container);
    Object.defineProperty(img, "naturalWidth", { value: 1, configurable: true });
    fireEvent.load(img);
    expect(container.querySelector('[data-icon-status="missing"]')).toBeTruthy();
  });

  it("short-circuits to the error state for an invalid sprite id", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { container } = render(<SpellIcon sprite="holystaff_heal_all" alt="Cura" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[data-icon-status="error"]')).toBeTruthy();
    warnSpy.mockRestore();
  });

  it("renders a distinct empty state when sprite is null, with no img mounted", () => {
    const { container } = render(<SpellIcon sprite={null} alt="Slot Q vazio" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[data-icon-status="empty"]')).toBeTruthy();
    expect(screen.getByRole("img", { name: "Slot Q vazio" })).toBeInTheDocument();
  });

  it("renders alt on the img for a resolved sprite", () => {
    render(<SpellIcon sprite="HOLYSTAFF_HEAL_ALL" alt="Cura em Área" />);
    expect(screen.getByAltText("Cura em Área")).toBeInTheDocument();
  });

  it("renders the slot label glyph, hidden from assistive tech", () => {
    const { container } = render(
      <SpellIcon sprite="HOLYSTAFF_HEAL_ALL" alt="Cura" slotLabel="Q" />
    );
    const glyph = screen.getByText("Q");
    expect(glyph.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector('[data-icon-status]')).toBeTruthy();
  });
});
