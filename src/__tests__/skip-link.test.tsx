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

// `Home` (ACM-096) reads `auth()`/`listMyCompsWithStatus()` directly — mocked
// here (unauthenticated, matching this suite's landing-only assertions) so
// this suite never pulls in the real `@/auth/config` module, which
// transitively imports `next-auth` and hits an unrelated extensionless
// `next/server` import that vitest's ESM resolution can't follow.
vi.mock("@/auth/config", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/actions/comps", () => ({ listMyCompsWithStatus: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/i18n/server-locale", () => ({ getRequestLocale: vi.fn().mockResolvedValue("pt-BR") }));

import Home from "@/app/page";
import BuildsPage from "@/app/builds/page";
import NewBuildPage from "@/app/(editor)/build/new/page";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return { ...actual, useRouter: vi.fn(() => ({ refresh: vi.fn() })) };
});

/**
 * The global skip link in `src/app/layout.tsx` always points at
 * `#main-content`. Every route it renders on must expose that landmark, or
 * the link is a dead anchor (ACM-037 review finding).
 */
describe("global skip link target (ACM-037 review fix)", () => {
  it("renders a focusable #main-content landmark on the home route", async () => {
    render(await Home());
    const main = document.getElementById("main-content");
    expect(main).toBeInTheDocument();
    expect(main?.tagName).toBe("MAIN");
    expect(main).toHaveAttribute("tabindex", "-1");
  });

  it("renders a focusable #main-content landmark on /build/new", () => {
    render(
    <LocaleProvider initialLocale="pt-BR">
      <NewBuildPage />
    </LocaleProvider>
  );
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
    render(
    <LocaleProvider initialLocale="pt-BR">
      <NewBuildPage />
    </LocaleProvider>
  );
    expect(screen.queryByLabelText("Nome do build")).not.toHaveFocus();
  });
});
