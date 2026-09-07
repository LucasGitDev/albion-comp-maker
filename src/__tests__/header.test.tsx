import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";

function mockSession(user: { name?: string } | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => (user ? { user } : {}),
    })
  );
}

describe("Header (ACM-037 AC#1, AC#3, AC#4)", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/");
    mockSession(null);
  });

  it("renders the header landmark with the brand link and primary nav", () => {
    render(<Header />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Principal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /página inicial/i })).toHaveAttribute("href", "/");
  });

  it("shows the accent 'Nova build' CTA outside editor routes", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<Header />);
    expect(screen.getAllByRole("link", { name: "Nova build" }).length).toBeGreaterThan(0);
  });

  it("suppresses the 'Nova build' CTA on editor routes and shows the account slot instead", async () => {
    vi.mocked(usePathname).mockReturnValue("/build/new");
    render(<Header />);
    expect(screen.queryByRole("link", { name: "Nova build" })).not.toBeInTheDocument();
    expect(screen.getByTestId("header-account-slot")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument());
  });

  it("marks the current route with aria-current", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<Header />);
    expect(screen.getByRole("link", { name: "Minhas comps" })).toHaveAttribute("aria-current", "page");
  });
});
