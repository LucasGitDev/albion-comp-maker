import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ItemIcon } from "@/components/icons/ItemIcon";

describe("ItemIcon (use-icon-status branch coverage)", () => {
  it("starts in loading status and shows an error glyph immediately for an invalid id", () => {
    render(<ItemIcon itemId="not-a-valid-id" alt="Item" />);
    const wrapper = screen.getByTitle("not-a-valid-id");
    expect(wrapper).toHaveAttribute("data-icon-status", "error");
  });

  it("transitions to loaded when the image successfully loads with a real width", () => {
    render(<ItemIcon itemId="T4_HEAD_PLATE_SET1" alt="Item" />);
    const img = screen.getByAltText("Item");
    Object.defineProperty(img, "naturalWidth", { configurable: true, value: 64 });
    fireEvent.load(img);

    const wrapper = img.closest("[data-icon-status]");
    expect(wrapper).toHaveAttribute("data-icon-status", "loaded");
  });

  it("transitions to missing when the image loads as a 1x1 placeholder", () => {
    render(<ItemIcon itemId="T4_HEAD_PLATE_SET1" alt="Item" />);
    const img = screen.getByAltText("Item");
    Object.defineProperty(img, "naturalWidth", { configurable: true, value: 1 });
    fireEvent.load(img);

    const wrapper = img.closest("[data-icon-status]");
    expect(wrapper).toHaveAttribute("data-icon-status", "missing");
  });

  it("transitions to error on an onError event", () => {
    render(<ItemIcon itemId="T4_HEAD_PLATE_SET1" alt="Item" />);
    const img = screen.getByAltText("Item");
    fireEvent.error(img);

    const wrapper = img.closest("[data-icon-status]");
    expect(wrapper).toHaveAttribute("data-icon-status", "error");
  });

  it("resets to loading when the itemId (and thus src) changes", () => {
    const { rerender } = render(<ItemIcon itemId="T4_HEAD_PLATE_SET1" alt="Item" />);
    const img = screen.getByAltText("Item");
    fireEvent.error(img);
    expect(img.closest("[data-icon-status]")).toHaveAttribute("data-icon-status", "error");

    rerender(<ItemIcon itemId="T4_MAIN_SWORD" alt="Item" />);
    const wrapper = screen.getByAltText("Item").closest("[data-icon-status]");
    expect(wrapper).toHaveAttribute("data-icon-status", "loading");
  });
});
