import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SlotGroupNav } from "@/components/editor/SlotGroupNav";

const GROUPS = [
  { id: "armas", title: "Armas", filled: 1, total: 2 },
  { id: "armadura", title: "Armadura", filled: 0, total: 3 },
];

function renderNavWithTargets(props: Partial<React.ComponentProps<typeof SlotGroupNav>> = {}) {
  render(
    <div>
      <SlotGroupNav groups={GROUPS} totalFilled={1} totalSlots={9} swapsCount={0} {...props} />
      <h3 id="slot-group-armas" tabIndex={-1}>
        Armas
      </h3>
      <h3 id="slot-group-armadura" tabIndex={-1}>
        Armadura
      </h3>
      <div id="slot-group-swaps" tabIndex={-1}>
        Swaps
      </div>
    </div>
  );
}

describe("SlotGroupNav (ACM-041)", () => {
  it("renders real anchor links, one per group plus swaps, each with a visible counter", () => {
    renderNavWithTargets();
    const armas = screen.getByRole("link", { name: /armas 1 de 2/i });
    const armadura = screen.getByRole("link", { name: /armadura 0 de 3/i });
    const swaps = screen.getByRole("link", { name: /swaps 0/i });
    expect(armas).toHaveAttribute("href", "#slot-group-armas");
    expect(armadura).toHaveAttribute("href", "#slot-group-armadura");
    expect(swaps).toHaveAttribute("href", "#slot-group-swaps");
  });

  it("never uses aria-selected (no tab/tablist vocabulary introduced)", () => {
    renderNavWithTargets();
    const nav = screen.getByRole("navigation", { name: /grupos de slots/i });
    expect(nav.querySelector("[aria-selected]")).toBeNull();
    expect(nav.querySelector('[role="tab"]')).toBeNull();
    expect(nav.querySelector('[role="tablist"]')).toBeNull();
  });

  it("moves focus to the target group heading when its chip is clicked (not <body>, not nowhere)", () => {
    renderNavWithTargets();
    const chip = screen.getByRole("link", { name: /armadura 0 de 3/i });
    fireEvent.click(chip);
    const heading = document.getElementById("slot-group-armadura");
    expect(document.activeElement).toBe(heading);
    expect(document.activeElement).not.toBe(document.body);
  });

  it("moves focus to the swaps anchor wrapper when the swaps chip is clicked", () => {
    renderNavWithTargets();
    const chip = screen.getByRole("link", { name: /swaps 0/i });
    fireEvent.click(chip);
    expect(document.activeElement).toBe(document.getElementById("slot-group-swaps"));
  });

  it("updates the visible active chip to Swaps immediately on click, not just focus (visual review CRITICAL/HIGH: the chip must never stay stuck on a previous group, especially a short last section the IntersectionObserver may never flag as intersecting)", () => {
    renderNavWithTargets();
    const armadura = screen.getByRole("link", { name: /armadura 0 de 3/i });
    fireEvent.click(armadura);
    expect(armadura).toHaveAttribute("aria-current", "location");

    const swaps = screen.getByRole("link", { name: /swaps 0/i });
    fireEvent.click(swaps);
    expect(swaps).toHaveAttribute("aria-current", "location");
    expect(armadura).not.toHaveAttribute("aria-current");
  });

  it("does not render a redundant check-mark glyph for a complete group (AA contrast fail, ACM-041 visual review) — the count text already conveys completion", () => {
    renderNavWithTargets({ groups: [{ id: "armas", title: "Armas", filled: 2, total: 2 }] });
    const chip = screen.getByRole("link", { name: /armas 2 de 2/i });
    expect(chip).not.toHaveTextContent("✓");
    expect(chip).toHaveTextContent("Armas 2/2");
  });

  describe("scroll-spy (IntersectionObserver present)", () => {
    let observedTargets: Element[] = [];
    let ioCallback: IntersectionObserverCallback | null = null;

    class StubIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds = [];
      constructor(callback: IntersectionObserverCallback) {
        ioCallback = callback;
      }
      observe(target: Element): void {
        observedTargets.push(target);
      }
      unobserve(): void {}
      disconnect(): void {
        observedTargets = [];
      }
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }

    afterEach(() => {
      vi.unstubAllGlobals();
      observedTargets = [];
      ioCallback = null;
    });

    it("does nothing when no anchor targets exist in the document yet", () => {
      vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
      render(<SlotGroupNav groups={GROUPS} totalFilled={1} totalSlots={9} swapsCount={0} />);
      expect(observedTargets).toHaveLength(0);
    });

    it("marks the topmost intersecting target active via the observer callback", () => {
      vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
      // Keeps `checkScrollEnd` (which also runs after every observer
      // callback) from overriding this assertion with the "at bottom of
      // document" fallback — jsdom's default scrollHeight is 0.
      Object.defineProperty(document.documentElement, "scrollHeight", {
        configurable: true,
        value: 100_000,
      });

      renderNavWithTargets();
      expect(ioCallback).not.toBeNull();

      const armaduraHeading = document.getElementById("slot-group-armadura")!;
      const entry = {
        isIntersecting: true,
        boundingClientRect: { top: 10 } as DOMRectReadOnly,
        target: armaduraHeading,
      } as unknown as IntersectionObserverEntry;

      act(() => {
        ioCallback!([entry], {} as IntersectionObserver);
      });

      const armadura = screen.getByRole("link", { name: /armadura 0 de 3/i });
      expect(armadura).toHaveAttribute("aria-current", "location");
    });

    it("forces the last target active once the user reaches the bottom of the document, even with no visible entries", () => {
      vi.stubGlobal("IntersectionObserver", StubIntersectionObserver);
      const originalInnerHeight = window.innerHeight;
      const originalScrollHeight = Object.getOwnPropertyDescriptor(
        Document.prototype,
        "scrollHeight",
      );
      Object.defineProperty(window, "innerHeight", { configurable: true, value: 10_000 });
      Object.defineProperty(document.documentElement, "scrollHeight", {
        configurable: true,
        value: 100,
      });

      renderNavWithTargets();
      expect(ioCallback).not.toBeNull();
      act(() => {
        ioCallback!([], {} as IntersectionObserver);
      });

      const swaps = screen.getByRole("link", { name: /swaps 0/i });
      expect(swaps).toHaveAttribute("aria-current", "location");

      Object.defineProperty(window, "innerHeight", { configurable: true, value: originalInnerHeight });
      if (originalScrollHeight) {
        Object.defineProperty(document.documentElement, "scrollHeight", originalScrollHeight);
      }
    });
  });
});
