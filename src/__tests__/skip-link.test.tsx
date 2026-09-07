import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AOItem } from "@/data/ao-data.d";

vi.mock("@/actions/builds", () => ({
  listMyBuilds: vi.fn().mockResolvedValue([]),
  saveBuild: vi.fn(),
}));

vi.mock("@/components/editor/use-item-catalogue", () => {
  const items: AOItem[] = [];
  return { useItemCatalogue: () => ({ items, loading: false, failed: false, failedReason: null, retry: vi.fn() }) };
});

import Home from "@/app/page";
import BuildsPage from "@/app/builds/page";
import NewBuildPage from "@/app/(editor)/build/new/page";

/**
 * The global skip link in `src/app/layout.tsx` always points at
 * `#main-content`. Every route it renders on must expose that landmark, or
 * the link is a dead anchor (ACM-037 review finding).
 */
describe("global skip link target (ACM-037 review fix)", () => {
  it("renders a focusable #main-content landmark on the home route", () => {
    render(<Home />);
    const main = document.getElementById("main-content");
    expect(main).toBeInTheDocument();
    expect(main?.tagName).toBe("MAIN");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("renders a focusable #main-content landmark on /build/new", () => {
    render(<NewBuildPage />);
    const main = document.getElementById("main-content");
    expect(main).toBeInTheDocument();
    expect(main?.tagName).toBe("MAIN");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("renders a focusable #main-content landmark on /builds", async () => {
    render(await BuildsPage());
    const main = document.getElementById("main-content");
    expect(main).toBeInTheDocument();
    expect(main?.tagName).toBe("MAIN");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("does not steal initial focus away from the skip link on /build/new", () => {
    render(<NewBuildPage />);
    expect(screen.queryByLabelText("Nome do build")).not.toHaveFocus();
  });
});
