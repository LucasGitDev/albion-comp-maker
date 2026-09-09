import { render, screen } from "@testing-library/react";
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

describe("Home ('/') — AC#1/AC#4 authenticated with comps", () => {
  it("renders each comp's name, build count and Publica/Privada badge, linking to /comps/<id>", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" }, expires: "" });
    mockListMyCompsWithStatus.mockResolvedValue([
      makeCompListItem({ id: "comp-1", name: "ZvZ Terça", buildCount: 4, isPublic: false }),
      makeCompListItem({ id: "comp-2", name: "Gank Squad", buildCount: 1, isPublic: true }),
    ]);
    const { default: Home } = await import("@/app/page");

    const element = await Home();
    render(element);

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
    mockAuth.mockResolvedValue({ user: { id: "user-1" }, expires: "" });
    mockListMyCompsWithStatus.mockResolvedValue([]);
    const { default: Home } = await import("@/app/page");

    const element = await Home();
    render(element);

    expect(screen.getByText("Sua primeira comp")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: "Criar comp" });
    expect(cta).toHaveAttribute("href", "/comp/new");
  });
});

describe("Home ('/') — AC#5 listMyCompsWithStatus failure is a recoverable error, not a redirect", () => {
  it("renders an error message with a 'Tentar de novo' action instead of throwing/redirecting", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" }, expires: "" });
    mockListMyCompsWithStatus.mockRejectedValue(new Error("db down"));
    const { default: Home } = await import("@/app/page");

    const element = await Home();
    render(element);

    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });
});
