import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRefresh, mockToggleCompPublic, mockToggleBuildPublic } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockToggleCompPublic: vi.fn(),
  mockToggleBuildPublic: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/actions/comps", () => ({
  toggleCompPublic: mockToggleCompPublic,
}));

vi.mock("@/actions/builds", () => ({
  toggleBuildPublic: mockToggleBuildPublic,
}));

import { CompShareStatus } from "@/components/comp/CompShareStatus";
import type { CompPublishState } from "@/types/comp-publish-status";

function baseState(overrides: Partial<CompPublishState> = {}): CompPublishState {
  return {
    isPublic: true,
    isReachable: true,
    hasNoBuilds: false,
    blockers: [],
    ...overrides,
  };
}

describe("CompShareStatus (ACM-066, decision-025)", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    mockToggleCompPublic.mockReset();
    mockToggleBuildPublic.mockReset();
  });

  it("renders the copyable public link when the comp is reachable", () => {
    render(
      <CompShareStatus
        compId="comp-1"
        slug="zvz-comp-1"
        publicOrigin="https://example.com"
        initialState={baseState()}
      />,
    );

    expect(screen.getByDisplayValue("https://example.com/comp/zvz-comp-1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar link/i })).toBeInTheDocument();
  });

  it("hides the public link and the copy button when the comp is public but unreachable", () => {
    render(
      <CompShareStatus
        compId="comp-1"
        slug="zvz-comp-1"
        publicOrigin="https://example.com"
        initialState={baseState({
          isReachable: false,
          blockers: [
            {
              compBuildId: "cb-1",
              position: 0,
              buildId: "build-1",
              buildName: "My Private Build",
              reason: "private-own",
              ownedByMe: true,
            },
          ],
        })}
      />,
    );

    expect(screen.queryByDisplayValue("https://example.com/comp/zvz-comp-1")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copiar link/i })).not.toBeInTheDocument();
  });

  it("lists blockers with their reason text and only offers 'Tornar pública' for private-own", () => {
    render(
      <CompShareStatus
        compId="comp-1"
        slug="zvz-comp-1"
        publicOrigin="https://example.com"
        initialState={baseState({
          isReachable: false,
          blockers: [
            {
              compBuildId: "cb-own",
              position: 0,
              buildId: "build-own",
              buildName: "My Build",
              reason: "private-own",
              ownedByMe: true,
            },
            {
              compBuildId: "cb-foreign",
              position: 1,
              buildId: "build-foreign",
              buildName: "Their Build",
              reason: "private-foreign",
              ownedByMe: false,
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("My Build")).toBeInTheDocument();
    expect(screen.getByText("Their Build")).toBeInTheDocument();
    expect(screen.getByText(/sua build está privada/i)).toBeInTheDocument();
    expect(screen.getByText(/não está mais pública/i)).toBeInTheDocument();

    const makePublicButtons = screen.getAllByRole("button", { name: /tornar pública/i });
    expect(makePublicButtons).toHaveLength(1);
  });

  it("shows a 'no builds' message when the comp is public but has no builds at all", () => {
    render(
      <CompShareStatus
        compId="comp-1"
        slug="zvz-comp-1"
        publicOrigin="https://example.com"
        initialState={baseState({ isReachable: false, hasNoBuilds: true, blockers: [] })}
      />,
    );

    expect(screen.getByText(/não tem nenhuma build/i)).toBeInTheDocument();
  });

  it("renders no alert panel and no link when the comp is private", () => {
    render(
      <CompShareStatus
        compId="comp-1"
        slug="zvz-comp-1"
        publicOrigin="https://example.com"
        initialState={baseState({ isPublic: false, isReachable: false })}
      />,
    );

    expect(screen.queryByDisplayValue("https://example.com/comp/zvz-comp-1")).not.toBeInTheDocument();
    expect(screen.queryByText(/não vai abrir/i)).not.toBeInTheDocument();
  });
});
