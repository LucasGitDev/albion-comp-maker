import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AOItem } from "@/data/ao-data.d";
import type { ReactNode } from "react";

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

// `RootLayout` pulls in `next/font/google`, which relies on Next.js's build
// pipeline (SWC font-loader transform) to resolve to real font data — it
// throws when imported directly under Vitest/jsdom. Stubbed here with the
// minimal shape `RootLayout` actually consumes (`.variable`) so the *real*
// `RootLayout` tree — including its one true skip-link `<a>` — renders.
vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-sans" }),
  Geist_Mono: () => ({ variable: "font-mono" }),
}));

import RootLayout from "@/app/layout";
import Home from "@/app/page";
import BuildsPage from "@/app/builds/page";
import NewBuildPage from "@/app/(editor)/build/new/page";

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return { ...actual, useRouter: vi.fn(() => ({ refresh: vi.fn() })) };
});

/**
 * Renders the *real* `RootLayout` (src/app/layout.tsx) — the single source
 * of the skip link — around each route's real page content, instead of
 * hardcoding `#main-content` on both sides (ACM-053: the previous version of
 * this suite asserted the skip link's href and the landmark's id matched a
 * literal string independently, which would still pass if the anchor's
 * `href` were renamed but the landmark id were not, or vice versa).
 */
async function renderRoute(children: ReactNode) {
  const layout = await RootLayout({ children });
  return render(layout);
}

describe("global skip link target (ACM-037 review fix, ACM-053 rewrite)", () => {
  it.each([
    ["/", async () => await renderRoute(await Home())],
    [
      "/build/new",
      async () => await renderRoute(<NewBuildPage />),
    ],
    ["/builds", async () => await renderRoute(await BuildsPage())],
  ])("resolves the skip link's real href to a focusable landmark on %s", async (_route, renderPage) => {
    const { container } = await renderPage();

    const skipLink = container.querySelector<HTMLAnchorElement>('a[href^="#"]');
    expect(skipLink).not.toBeNull();

    const href = skipLink?.getAttribute("href") ?? "";
    expect(href).toMatch(/^#.+/);

    const target = document.querySelector(href);
    expect(target).not.toBeNull();
    expect(target?.tagName).toBe("MAIN");
    expect(target).toHaveAttribute("tabindex", "-1");
  });

  it("does not steal initial focus away from the skip link on /build/new", async () => {
    const { getByLabelText } = await renderRoute(<NewBuildPage />);
    expect(getByLabelText("Nome do build")).not.toHaveFocus();
  });
});
