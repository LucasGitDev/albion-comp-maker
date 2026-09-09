import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";

const { mockAuth, mockListMyCompsWithStatus } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockListMyCompsWithStatus: vi.fn(),
}));

vi.mock("@/auth/config", () => ({
  auth: mockAuth,
}));

vi.mock("@/actions/comps", () => ({
  listMyCompsWithStatus: mockListMyCompsWithStatus,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/i18n/server-locale", () => ({
  getRequestLocale: vi.fn().mockResolvedValue("pt-BR"),
}));

function makeCompListItem(overrides: Partial<{ id: string; name: string; buildCount: number; isPublic: boolean }> = {}) {
  const id = overrides.id ?? "comp-1";
  return {
    comp: {
      id,
      userId: "user-1",
      name: overrides.name ?? "ZvZ Terça",
      slug: `${id}-abc`,
      contentType: null,
      isPublic: overrides.isPublic ?? false,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
    },
    buildCount: overrides.buildCount ?? 4,
    privateBuildCount: 0,
    isReachable: false,
  };
}

describe("Home ('/') — AC#2 unauthenticated sees the landing, not the comp list", () => {
  it("renders the login CTA and never calls listMyCompsWithStatus", async () => {
    mockAuth.mockResolvedValue(null);
    const { default: Home } = await import("@/app/page");

    const element = await Home();
    render(element);

    expect(screen.getByRole("link", { name: "Entrar com Discord" })).toBeInTheDocument();
    expect(screen.queryByText("Minhas comps")).not.toBeInTheDocument();
    expect(mockListMyCompsWithStatus).not.toHaveBeenCalled();
  });
});

/**
 * `CompsList` is an async Server Component rendered inside `<Suspense>` by
 * `Home` (ACM-096 fix: this scopes the loading skeleton to the comp list
 * only, instead of a root `app/loading.tsx` that leaked into every route —
 * see `src/app/page.tsx` doc comment). Next.js's RSC runtime can execute an
 * async component under `<Suspense>` directly; plain `react-dom` (used by
 * `@testing-library/react` here) cannot, so these tests await `CompsList()`
 * directly instead of round-tripping through a real Suspense
 * suspend/resolve cycle. The scoping itself — that the fallback only wraps
 * this list, not the whole page or other routes — is verified by
 * `root-loading-boundary.test.ts` and by manual browser verification (see
 * ACM-096 implementation notes).
 */
describe("Home ('/') — AC#1/AC#4 authenticated with comps", () => {
  it("renders each comp's name, build count and Publica/Privada badge, linking to /comps/<id>", async () => {
    mockListMyCompsWithStatus.mockResolvedValue([
      makeCompListItem({ id: "comp-1", name: "ZvZ Terça", buildCount: 4, isPublic: false }),
      makeCompListItem({ id: "comp-2", name: "Gank Squad", buildCount: 1, isPublic: true }),
    ]);
    const { CompsList } = await import("@/app/page");

    render(await CompsList());

    expect(screen.getByText("ZvZ Terça")).toBeInTheDocument();
    expect(screen.getByText("4 builds")).toBeInTheDocument();
    expect(screen.getByText("Privada")).toBeInTheDocument();

    expect(screen.getByText("Gank Squad")).toBeInTheDocument();
    expect(screen.getByText("1 build")).toBeInTheDocument();
    expect(screen.getByText("Pública")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /ZvZ Terça/ })).toHaveAttribute("href", "/comps/comp-1");
    expect(screen.getByRole("link", { name: /Gank Squad/ })).toHaveAttribute("href", "/comps/comp-2");
  });
});

describe("Home ('/') — AC#3 authenticated with zero comps sees the real empty state", () => {
  it("shows 'Sua primeira comp' with a 'Criar comp' CTA to /comp/new", async () => {
    mockListMyCompsWithStatus.mockResolvedValue([]);
    const { CompsList } = await import("@/app/page");

    render(await CompsList());

    expect(screen.getByText("Sua primeira comp")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: "Criar comp" });
    expect(cta).toHaveAttribute("href", "/comp/new");
  });
});

describe("Home ('/') — AC#5 listMyCompsWithStatus failure is a recoverable error, not a redirect", () => {
  it("renders an error message with a 'Tentar de novo' action instead of throwing/redirecting", async () => {
    mockListMyCompsWithStatus.mockRejectedValue(new Error("db down"));
    const { CompsList } = await import("@/app/page");

    render(await CompsList());

    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});

describe("Home ('/') — loading skeleton is scoped to the comp list, not app-wide", () => {
  it("wraps only <CompsList> in <Suspense fallback={<CompListSkeleton/>}>, not the whole page shell", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" }, expires: "" });
    mockListMyCompsWithStatus.mockResolvedValue([]);
    const { default: Home, CompsList } = await import("@/app/page");
    const { CompListSkeleton } = await import("@/components/comp/CompListSkeleton");

    const element = await Home();
    render(element);

    // The page shell (title, "Nova build"/"Nova comp" CTAs) is present
    // immediately, outside of any Suspense boundary.
    expect(screen.getByText("Minhas comps")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nova build" })).toBeInTheDocument();

    // Structurally: the tree contains a <Suspense> whose fallback is
    // <CompListSkeleton/> and whose child is <CompsList/>, not the whole
    // page — this is what keeps the skeleton from leaking into every route
    // the way a root `app/loading.tsx` would.
    function findSuspense(node: unknown): React.ReactElement<{ fallback: unknown; children: unknown }> | null {
      if (node == null || typeof node !== "object") return null;
      const el = node as React.ReactElement;
      if (el.type === Suspense) return el as never;
      const children = (el.props as { children?: unknown } | undefined)?.children;
      if (Array.isArray(children)) {
        for (const child of children) {
          const found = findSuspense(child);
          if (found) return found;
        }
      } else if (children) {
        return findSuspense(children);
      }
      return null;
    }

    const suspenseEl = findSuspense(element);
    expect(suspenseEl).not.toBeNull();
    expect((suspenseEl?.props.fallback as React.ReactElement)?.type).toBe(CompListSkeleton);
    expect((suspenseEl?.props.children as React.ReactElement)?.type).toBe(CompsList);
  });
});
