import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Breadcrumb } from "@/components/layout/Breadcrumb";

describe("Breadcrumb", () => {
  it("renders just 'Minhas comps' -> current when there is no comp context", () => {
    render(<Breadcrumb current="Tank principal" />);
    expect(screen.getByRole("link", { name: "← Minhas comps" })).toHaveAttribute("href", "/");
    expect(screen.getByText("Tank principal")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "ZvZ Terça" })).not.toBeInTheDocument();
  });

  it("shows the comp -> build trail and links back to the comp (ACM-100 AC#5)", () => {
    render(<Breadcrumb current="Tank principal" comp={{ name: "ZvZ Terça", href: "/comps/comp-1" }} />);
    expect(screen.getByRole("link", { name: "← Minhas comps" })).toHaveAttribute("href", "/");
    const compLink = screen.getByRole("link", { name: "ZvZ Terça" });
    expect(compLink).toHaveAttribute("href", "/comps/comp-1");
    expect(screen.getByText("Tank principal")).toBeInTheDocument();
  });

  it("hides the '›' separators and current/comp segments below the sm breakpoint, keeping only the back link (ACM-078)", () => {
    render(
      <Breadcrumb current="Tank principal" comp={{ name: "ZvZ Terça", href: "/comps/comp-1" }} />,
    );
    const backLink = screen.getByRole("link", { name: "← Minhas comps" });
    expect(backLink.closest("li")?.className ?? "").not.toContain("hidden");
    for (const el of [
      screen.getByRole("link", { name: "ZvZ Terça" }).closest("li"),
      screen.getByText("Tank principal"),
      ...screen.getAllByText("›", { selector: "li" }),
    ]) {
      expect(el?.className).toContain("hidden");
      expect(el?.className).toContain("sm:inline");
    }
  });

  it("constrains nav/ol to min-w-0 so a long comp/build name can shrink instead of forcing the page wider (ACM-078)", () => {
    render(
      <Breadcrumb
        current="Um nome de build extremamente longo para forçar overflow horizontal"
        comp={{ name: "Um nome de comp igualmente longo para o mesmo teste", href: "/comps/comp-1" }}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Trilha" });
    expect(nav.className).toContain("min-w-0");
    expect(nav.querySelector("ol")?.className).toContain("min-w-0");
  });
});
