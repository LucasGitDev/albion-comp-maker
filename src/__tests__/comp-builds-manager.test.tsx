import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockAddBuildToComp, mockRemoveBuildFromComp, mockReorderCompBuilds, mockUpdateCompBuild } = vi.hoisted(() => ({
  mockAddBuildToComp: vi.fn(),
  mockRemoveBuildFromComp: vi.fn(),
  mockReorderCompBuilds: vi.fn(),
  mockUpdateCompBuild: vi.fn(),
}));

vi.mock("@/actions/comps", () => ({
  addBuildToComp: mockAddBuildToComp,
  removeBuildFromComp: mockRemoveBuildFromComp,
  reorderCompBuilds: mockReorderCompBuilds,
  updateCompBuild: mockUpdateCompBuild,
}));

import type { CompBuildEntry, MyBuildOption } from "@/components/comp/CompBuildsManager";
import { CompBuildsManager } from "@/components/comp/CompBuildsManager";

function entry(overrides: Partial<CompBuildEntry> = {}): CompBuildEntry {
  return {
    compBuildId: "cb-1",
    position: 0,
    count: 1,
    label: null,
    build: { id: "build-1", name: "Tank Build", role: "Tank", slug: "tank-build", isPublic: true },
    ...overrides,
  };
}

const myBuilds: MyBuildOption[] = [{ id: "build-2", name: "Healer Build", role: "Healer" }];

describe("CompBuildsManager (ACM-098)", () => {
  beforeEach(() => {
    mockAddBuildToComp.mockReset();
    mockRemoveBuildFromComp.mockReset();
    mockReorderCompBuilds.mockReset();
    mockUpdateCompBuild.mockReset();
  });

  it("AC#1: renders every entry in position order", () => {
    render(
      <CompBuildsManager
        compId="comp-1"
        initialEntries={[
          entry({ compBuildId: "cb-1", position: 0, build: { id: "b1", name: "First", role: null, slug: "first", isPublic: true } }),
          entry({ compBuildId: "cb-2", position: 1, build: { id: "b2", name: "Second", role: null, slug: "second", isPublic: true } }),
        ]}
        myBuilds={myBuilds}
      />,
    );

    const names = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(names[0]).toContain("First");
    expect(names[1]).toContain("Second");
  });

  it("AC#6: shows the empty state explaining the broken public link when there are no builds", () => {
    render(<CompBuildsManager compId="comp-1" initialEntries={[]} myBuilds={myBuilds} />);

    expect(screen.getByText("Nenhuma build nesta comp")).toBeInTheDocument();
    expect(screen.getByText(/só pode ser exportada com pelo menos uma build/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /adicionar build/i }).length).toBeGreaterThan(0);
  });

  it("AC#2: adding a build calls addBuildToComp and the entry appears without a full reload", async () => {
    mockAddBuildToComp.mockResolvedValue({ id: "cb-new", compId: "comp-1", buildId: "build-2", position: 1, count: 1, label: null });

    render(<CompBuildsManager compId="comp-1" initialEntries={[entry()]} myBuilds={myBuilds} />);

    fireEvent.click(screen.getByRole("button", { name: "Adicionar build" }));
    fireEvent.click(await screen.findByRole("button", { name: /healer build/i }));

    await waitFor(() => expect(mockAddBuildToComp).toHaveBeenCalledWith({ compId: "comp-1", buildId: "build-2" }));
    expect(await screen.findByText("Healer Build")).toBeInTheDocument();
  });

  it("AC#2 (error path): reverts and shows a retry banner when addBuildToComp fails", async () => {
    mockAddBuildToComp.mockRejectedValue(new Error("boom"));

    render(<CompBuildsManager compId="comp-1" initialEntries={[entry()]} myBuilds={myBuilds} />);

    fireEvent.click(screen.getByRole("button", { name: "Adicionar build" }));
    fireEvent.click(await screen.findByRole("button", { name: /healer build/i }));

    expect(await screen.findByText(/não foi possível adicionar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tentar de novo/i })).toBeInTheDocument();
    expect(screen.queryByText("Healer Build")).not.toBeInTheDocument();
  });

  it("AC#3: removing an entry calls removeBuildFromComp and drops it from the list immediately", async () => {
    mockRemoveBuildFromComp.mockResolvedValue(undefined);

    render(<CompBuildsManager compId="comp-1" initialEntries={[entry()]} myBuilds={myBuilds} />);

    fireEvent.click(screen.getByRole("button", { name: "Remover" }));

    expect(screen.queryByText("Tank Build")).not.toBeInTheDocument();
    await waitFor(() => expect(mockRemoveBuildFromComp).toHaveBeenCalledWith("comp-1", "cb-1"));
  });

  it("AC#3 (error path): restores the entry and shows a retry banner when removal fails", async () => {
    mockRemoveBuildFromComp.mockRejectedValue(new Error("boom"));

    render(<CompBuildsManager compId="comp-1" initialEntries={[entry()]} myBuilds={myBuilds} />);

    fireEvent.click(screen.getByRole("button", { name: "Remover" }));

    await screen.findByText(/não foi possível remover/i);
    expect(screen.getByText("Tank Build")).toBeInTheDocument();
  });

  it("AC#4: moving an entry down persists the new order via reorderCompBuilds", async () => {
    mockReorderCompBuilds.mockResolvedValue([]);

    render(
      <CompBuildsManager
        compId="comp-1"
        initialEntries={[
          entry({ compBuildId: "cb-1", build: { id: "b1", name: "First", role: null, slug: "first", isPublic: true } }),
          entry({ compBuildId: "cb-2", build: { id: "b2", name: "Second", role: null, slug: "second", isPublic: true } }),
        ]}
        myBuilds={myBuilds}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /mover .* para baixo/i })[0]);

    await waitFor(() => expect(mockReorderCompBuilds).toHaveBeenCalledWith("comp-1", ["cb-2", "cb-1"]));
    const names = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(names[0]).toContain("Second");
    expect(names[1]).toContain("First");
  });

  it("AC#5: editing label and count persists via updateCompBuild", async () => {
    mockUpdateCompBuild.mockResolvedValue({});

    render(<CompBuildsManager compId="comp-1" initialEntries={[entry()]} myBuilds={myBuilds} />);

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Label"), { target: { value: "Main tank" } });
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(mockUpdateCompBuild).toHaveBeenCalledWith({
        compId: "comp-1",
        compBuildId: "cb-1",
        label: "Main tank",
        count: 3,
      }),
    );
    expect(screen.getByText(/Main tank/)).toBeInTheDocument();
  });
});
