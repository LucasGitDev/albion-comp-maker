import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: vi.fn(() => ({ refresh: vi.fn() })),
}));

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";

function mockSession(user: { name?: string } | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => (user ? { user } : {}),
    })
  );
}

function renderHeader() {
  return render(
    <LocaleProvider initialLocale="pt-BR">
      <Header />
    </LocaleProvider>
  );
}

describe("Header (ACM-037 AC#1, AC#3, AC#4; ACM-100 AC#1-4)", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/");
    mockSession(null);
  });

  it("renders the header landmark with the brand link and primary nav", () => {
    renderHeader();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Principal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /página inicial/i })).toHaveAttribute("href", "/");
  });

  it("shows the accent 'Nova comp' CTA outside editor routes", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    renderHeader();
    expect(screen.getAllByRole("link", { name: "Nova comp" }).length).toBeGreaterThan(0);
    for (const link of screen.getAllByRole("link", { name: "Nova comp" })) {
      expect(link).toHaveAttribute("href", "/comp/new");
    }
  });

  it("suppresses the 'Nova comp' CTA on editor routes and shows the account slot instead", async () => {
    vi.mocked(usePathname).mockReturnValue("/build/new");
    renderHeader();
    expect(screen.queryByRole("link", { name: "Nova comp" })).not.toBeInTheDocument();
    expect(screen.getByTestId("header-account-slot")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("link", { name: "Entrar" })).toBeInTheDocument());
  });

  it("hides the logged-area nav links when there is no session (ACM-100 AC#2)", async () => {
    vi.mocked(usePathname).mockReturnValue("/");
    renderHeader();
    await waitFor(() => expect(screen.queryByRole("link", { name: "Entrar" })).not.toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Minhas comps" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Minhas builds" })).not.toBeInTheDocument();
  });

  it("shows '/' and '/builds' with aria-current on the active route once authenticated (ACM-100 AC#1)", async () => {
    vi.mocked(usePathname).mockReturnValue("/");
    mockSession({ name: "Ada" });
    renderHeader();
    const compsLink = await screen.findByRole("link", { name: "Minhas comps" });
    expect(compsLink).toHaveAttribute("href", "/");
    expect(compsLink).toHaveAttribute("aria-current", "page");
    const buildsLink = screen.getByRole("link", { name: "Minhas builds" });
    expect(buildsLink).toHaveAttribute("href", "/builds");
    expect(buildsLink).not.toHaveAttribute("aria-current");
  });

  it("opens the mobile disclosure with both entries and Escape closes it, returning focus to the trigger (ACM-100 AC#3)", async () => {
    vi.mocked(usePathname).mockReturnValue("/");
    mockSession({ name: "Ada" });
    renderHeader();
    await screen.findByRole("link", { name: "Minhas comps" });

    const trigger = screen.getByRole("button", { name: "Abrir navegação" });
    fireEvent.click(trigger);

    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("shows the EN locale label when the locale is en-US (ACM-093)", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(
      <LocaleProvider initialLocale="en-US">
        <Header />
      </LocaleProvider>
    );
    expect(screen.getAllByRole("link", { name: "New comp" }).length).toBeGreaterThan(0);
  });
});
