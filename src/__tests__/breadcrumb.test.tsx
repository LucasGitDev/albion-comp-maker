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
});
