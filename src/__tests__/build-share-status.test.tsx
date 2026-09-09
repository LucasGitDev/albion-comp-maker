import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRefresh, mockToggleBuildPublic, mockRegenerateBuildSlug } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockToggleBuildPublic: vi.fn(),
  mockRegenerateBuildSlug: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/actions/builds", () => ({
  toggleBuildPublic: mockToggleBuildPublic,
  regenerateBuildSlug: mockRegenerateBuildSlug,
}));

import { BuildShareStatus } from "@/components/build/BuildShareStatus";

describe("BuildShareStatus (ACM-067)", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    mockToggleBuildPublic.mockReset();
    mockRegenerateBuildSlug.mockReset();
  });

  it("renders the copyable public link when the build is public", () => {
    render(
      <BuildShareStatus buildId="build-1" slug="fire-staff-abc123" isPublic publicOrigin="https://example.com" />,
    );

    expect(screen.getByDisplayValue("https://example.com/build/fire-staff-abc123")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar link/i })).toBeInTheDocument();
  });

  it("hides the link when the build is private", () => {
    render(
      <BuildShareStatus buildId="build-1" slug="fire-staff-abc123" isPublic={false} publicOrigin="https://example.com" />,
    );

    expect(screen.queryByDisplayValue("https://example.com/build/fire-staff-abc123")).not.toBeInTheDocument();
  });

  it("always shows the rename warning, public or private", () => {
    render(
      <BuildShareStatus buildId="build-1" slug="fire-staff-abc123" isPublic={false} publicOrigin="https://example.com" />,
    );

    expect(screen.getByText(/renomear a build não muda esse link/i)).toBeInTheDocument();
  });

  it("requires a confirmation step before regenerating the slug", async () => {
    mockRegenerateBuildSlug.mockResolvedValue({});
    render(
      <BuildShareStatus buildId="build-1" slug="fire-staff-abc123" isPublic publicOrigin="https://example.com" />,
    );

    fireEvent.click(screen.getByRole("button", { name: /gerar novo link/i }));
    expect(screen.getByText(/o link atual vai parar de funcionar imediatamente/i)).toBeInTheDocument();
    expect(mockRegenerateBuildSlug).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /confirmar novo link/i }));
    await vi.waitFor(() => expect(mockRegenerateBuildSlug).toHaveBeenCalledWith("build-1"));
    await vi.waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it("cancels the regenerate confirmation without calling the action", () => {
    render(
      <BuildShareStatus buildId="build-1" slug="fire-staff-abc123" isPublic publicOrigin="https://example.com" />,
    );

    fireEvent.click(screen.getByRole("button", { name: /gerar novo link/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByText(/o link atual vai parar de funcionar imediatamente/i)).not.toBeInTheDocument();
    expect(mockRegenerateBuildSlug).not.toHaveBeenCalled();
  });
});
