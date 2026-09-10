import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemIcon } from "./ItemIcon";

function getImg(container: HTMLElement): HTMLImageElement {
  const img = container.querySelector("img");
  if (!img) throw new Error("expected <img> to be in the DOM");
  return img as HTMLImageElement;
}

describe("ItemIcon", () => {
  it("renders the item proxy URL with type, id and quality", () => {
    const { container } = render(
      <ItemIcon itemId="T8_2H_HOLYSTAFF@3" alt="Cajado Sagrado" quality={4} />
    );
    const img = getImg(container);
    expect(img.getAttribute("src")).toBe(
      "/api/icon?type=item&id=T8_2H_HOLYSTAFF@3&q=4"
    );
  });

  it("defaults quality to 1 when not provided", () => {
    const { container } = render(<ItemIcon itemId="T4_BAG" alt="Bag" />);
    const img = getImg(container);
    expect(img.getAttribute("src")).toBe("/api/icon?type=item&id=T4_BAG&q=1");
  });

  it("shows the loading fallback before the image resolves", () => {
    const { container } = render(<ItemIcon itemId="T4_BAG" alt="Bag" />);
    expect(container.querySelector('[data-icon-status="loading"]')).toBeTruthy();
    const img = getImg(container);
    expect(img.className).toContain("opacity-0");
  });

  it("required alt reaches the DOM on the rendered img", () => {
    render(<ItemIcon itemId="T4_BAG" alt="Saco Reforçado" />);
    expect(screen.getByAltText("Saco Reforçado")).toBeInTheDocument();
  });

  it("detects a missing icon via naturalWidth <= 1 on load, not onError", () => {
    const { container } = render(<ItemIcon itemId="T4_BAG" alt="Bag" />);
    const img = getImg(container);
    Object.defineProperty(img, "naturalWidth", { value: 1, configurable: true });
    fireEvent.load(img);
    expect(container.querySelector('[data-icon-status="missing"]')).toBeTruthy();
  });

  it("falls back to the category silhouette (not a blank image) when the sprite is a 1x1 PNG", () => {
    const { container } = render(
      <ItemIcon itemId="UNIQUE_HEAD_VANITY_RANGER_HOOD" alt="Ranger Hood" category="armor" />
    );
    const img = getImg(container);
    Object.defineProperty(img, "naturalWidth", { value: 1, configurable: true });
    fireEvent.load(img);
    expect(container.querySelector('[data-icon-status="missing"]')).toBeTruthy();
    expect(container.querySelector('[data-category-silhouette="armor"]')).toBeTruthy();
    // the sprite itself stays transparent (opacity-0), the silhouette is the visible layer
    expect(img.className).toContain("opacity-0");
  });

  it("defaults the missing-state silhouette to 'generic' when no category is provided", () => {
    const { container } = render(<ItemIcon itemId="T4_BAG" alt="Bag" />);
    const img = getImg(container);
    Object.defineProperty(img, "naturalWidth", { value: 1, configurable: true });
    fireEvent.load(img);
    expect(container.querySelector('[data-category-silhouette="generic"]')).toBeTruthy();
  });

  it("transitions to loaded when naturalWidth is greater than 1", () => {
    const { container } = render(<ItemIcon itemId="T4_BAG" alt="Bag" />);
    const img = getImg(container);
    Object.defineProperty(img, "naturalWidth", { value: 64, configurable: true });
    fireEvent.load(img);
    expect(container.querySelector('[data-icon-status="loaded"]')).toBeTruthy();
    expect(img.className).toContain("opacity-100");
  });

  it("short-circuits to the error state for an invalid id without mounting an img", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { container } = render(<ItemIcon itemId="t4_bag" alt="Bag" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[data-icon-status="error"]')).toBeTruthy();
    expect(screen.getByText("!")).toBeInTheDocument();
    warnSpy.mockRestore();
  });

  it("renders alt='' and aria-hidden when decorative", () => {
    const { container } = render(
      <ItemIcon itemId="T4_BAG" alt="Bag" decorative />
    );
    const img = getImg(container);
    expect(img.getAttribute("alt")).toBe("");
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });

  // ACM-123: on a server-rendered page (the public build/comp share view)
  // the browser can finish fetching the `<img>` before React hydrates and
  // attaches `onLoad`. `HTMLImageElement.prototype.complete`/`naturalWidth`
  // are stubbed to already report "finished" at the moment the element is
  // inserted into the DOM, simulating that race — real `onLoad` never
  // fires in this scenario.
  it("resolves to loaded via the mount-time complete check when onLoad never fires (SSR hydration race)", () => {
    const completeSpy = vi
      .spyOn(HTMLImageElement.prototype, "complete", "get")
      .mockReturnValue(true);
    const widthSpy = vi
      .spyOn(HTMLImageElement.prototype, "naturalWidth", "get")
      .mockReturnValue(64);

    const { container } = render(<ItemIcon itemId="T4_BAG" alt="Bag" />);

    expect(container.querySelector('[data-icon-status="loaded"]')).toBeTruthy();
    const img = getImg(container);
    expect(img.className).toContain("opacity-100");

    completeSpy.mockRestore();
    widthSpy.mockRestore();
  });

  it("resolves to missing via the mount-time complete check for an already-loaded 1x1 sprite", () => {
    const completeSpy = vi
      .spyOn(HTMLImageElement.prototype, "complete", "get")
      .mockReturnValue(true);
    const widthSpy = vi
      .spyOn(HTMLImageElement.prototype, "naturalWidth", "get")
      .mockReturnValue(1);

    const { container } = render(<ItemIcon itemId="T4_BAG" alt="Bag" />);

    expect(container.querySelector('[data-icon-status="missing"]')).toBeTruthy();

    completeSpy.mockRestore();
    widthSpy.mockRestore();
  });
});
