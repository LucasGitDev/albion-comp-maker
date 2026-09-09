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

const myBuilds: MyBuildOption[] = [
  { id: "build-2", name: "Healer Build", role: "Healer", slug: "healer-build", isPublic: true },
];

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
        compId="comp-1" compName="Comp 1"
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
    render(<CompBuildsManager compId="comp-1" compName="Comp 1" initialEntries={[]} myBuilds={myBuilds} />);

    expect(screen.getByText("Nenhuma build nesta comp")).toBeInTheDocument();
    expect(screen.getByText(/só pode ser exportada com pelo menos uma build/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /adicionar build/i }).length).toBeGreaterThan(0);
  });

  it("AC#2: adding a build calls addBuildToComp and the entry appears without a full reload", async () => {
    mockAddBuildToComp.mockResolvedValue({ id: "cb-new", compId: "comp-1", buildId: "build-2", position: 1, count: 1, label: null });

    render(<CompBuildsManager compId="comp-1" compName="Comp 1" initialEntries={[entry()]} myBuilds={myBuilds} />);

    fireEvent.click(screen.getByRole("button", { name: "Adicionar build" }));
    fireEvent.click(await screen.findByRole("button", { name: /healer build/i }));

    await waitFor(() => expect(mockAddBuildToComp).toHaveBeenCalledWith({ compId: "comp-1", buildId: "build-2" }));
    expect(await screen.findByText("Healer Build")).toBeInTheDocument();
  });

  it("AC#2 (error path): reverts and shows a retry banner when addBuildToComp fails", async () => {
    mockAddBuildToComp.mockRejectedValue(new Error("boom"));

    render(<CompBuildsManager compId="comp-1" compName="Comp 1" initialEntries={[entry()]} myBuilds={myBuilds} />);

    fireEvent.click(screen.getByRole("button", { name: "Adicionar build" }));
    fireEvent.click(await screen.findByRole("button", { name: /healer build/i }));

    expect(await screen.findByText(/não foi possível adicionar/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tentar de novo/i })).toBeInTheDocument();
    expect(screen.queryByText("Healer Build")).not.toBeInTheDocument();
  });

  it("AC#3: removing an entry calls removeBuildFromComp and drops it from the list immediately", async () => {
    mockRemoveBuildFromComp.mockResolvedValue(undefined);

    render(<CompBuildsManager compId="comp-1" compName="Comp 1" initialEntries={[entry()]} myBuilds={myBuilds} />);

    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar remoção" }));

    expect(screen.queryByText("Tank Build")).not.toBeInTheDocument();
    await waitFor(() => expect(mockRemoveBuildFromComp).toHaveBeenCalledWith("comp-1", "cb-1"));
  });

  it("AC#3 (confirmation): clicking Remover without confirming does not call removeBuildFromComp", async () => {
    render(<CompBuildsManager compId="comp-1" compName="Comp 1" initialEntries={[entry()]} myBuilds={myBuilds} />);

    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByText("Tank Build")).toBeInTheDocument();
    expect(mockRemoveBuildFromComp).not.toHaveBeenCalled();
  });

  it("AC#3 (error path): restores the entry and shows a retry banner when removal fails", async () => {
    mockRemoveBuildFromComp.mockRejectedValue(new Error("boom"));

    render(<CompBuildsManager compId="comp-1" compName="Comp 1" initialEntries={[entry()]} myBuilds={myBuilds} />);

    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar remoção" }));

    await screen.findByText(/não foi possível remover/i);
    expect(screen.getByText("Tank Build")).toBeInTheDocument();
  });

  it("AC#4: moving an entry down persists the new order via reorderCompBuilds", async () => {
    mockReorderCompBuilds.mockResolvedValue([]);

    render(
      <CompBuildsManager
        compId="comp-1" compName="Comp 1"
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

    render(<CompBuildsManager compId="comp-1" compName="Comp 1" initialEntries={[entry()]} myBuilds={myBuilds} />);

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

  it("AC#4 (error path): restores the original order and shows a retry banner when reorderCompBuilds fails", async () => {
    mockReorderCompBuilds.mockRejectedValue(new Error("boom"));

    render(
      <CompBuildsManager
        compId="comp-1" compName="Comp 1"
        initialEntries={[
          entry({ compBuildId: "cb-1", build: { id: "b1", name: "First", role: null, slug: "first", isPublic: true } }),
          entry({ compBuildId: "cb-2", build: { id: "b2", name: "Second", role: null, slug: "second", isPublic: true } }),
        ]}
        myBuilds={myBuilds}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /mover .* para baixo/i })[0]);

    await screen.findByText(/não foi possível reordenar/i);
    const names = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(names[0]).toContain("First");
    expect(names[1]).toContain("Second");
  });

  it("AC#5 (error path): reverts label/count to the previous values and shows a retry banner when updateCompBuild fails", async () => {
    mockUpdateCompBuild.mockRejectedValue(new Error("boom"));

    render(<CompBuildsManager compId="comp-1" compName="Comp 1" initialEntries={[entry({ label: "Old label", count: 1 })]} myBuilds={myBuilds} />);

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Label"), { target: { value: "New label" } });
    fireEvent.change(screen.getByLabelText("Quantidade"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await screen.findByText(/não foi possível salvar/i);
    expect(screen.getByText(/Old label/)).toBeInTheDocument();
    expect(screen.getByText(/x1/)).toBeInTheDocument();
    expect(screen.queryByText(/New label/)).not.toBeInTheDocument();
  });

  it("concurrency guard: Salvar/Cancelar are disabled while another action (e.g. a reorder) is in flight", async () => {
    let resolveReorder!: (value: unknown) => void;
    mockReorderCompBuilds.mockImplementation(() => new Promise((resolve) => (resolveReorder = resolve)));

    render(
      <CompBuildsManager
        compId="comp-1" compName="Comp 1"
        initialEntries={[
          entry({ compBuildId: "cb-1", build: { id: "b1", name: "First", role: null, slug: "first", isPublic: true } }),
          entry({ compBuildId: "cb-2", build: { id: "b2", name: "Second", role: null, slug: "second", isPublic: true } }),
        ]}
        myBuilds={myBuilds}
      />,
    );

    // Open the edit panel on the second entry BEFORE starting the reorder, so Salvar/Cancelar exist
    // in the DOM (they are only rendered while `isEditing`) and we can assert they become disabled
    // once a different entry's reorder is in flight — this is the fix for the race where Salvar had
    // no `disabled` gating at all and could fire a save concurrently with an in-flight reorder.
    fireEvent.click(screen.getAllByRole("button", { name: "Editar" })[1]);
    expect(screen.getByRole("button", { name: "Salvar" })).not.toBeDisabled();

    fireEvent.click(screen.getAllByRole("button", { name: /mover .* para baixo/i })[0]);
    await waitFor(() => expect(mockReorderCompBuilds).toHaveBeenCalled());

    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    resolveReorder([]);
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).not.toBeDisabled());
  });

  it("reconciliation: a failed reorder swaps only the two moved entries back by id, leaving other entries' fields untouched", async () => {
    mockReorderCompBuilds.mockRejectedValue(new Error("boom"));

    render(
      <CompBuildsManager
        compId="comp-1" compName="Comp 1"
        initialEntries={[
          entry({
            compBuildId: "cb-1",
            label: "Kept label",
            count: 7,
            build: { id: "b1", name: "First", role: null, slug: "first", isPublic: true },
          }),
          entry({ compBuildId: "cb-2", build: { id: "b2", name: "Second", role: null, slug: "second", isPublic: true } }),
        ]}
        myBuilds={myBuilds}
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /mover .* para baixo/i })[0]);

    await screen.findByText(/não foi possível reordenar/i);

    const names = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(names[0]).toContain("First");
    expect(names[0]).toContain("Kept label");
    expect(names[0]).toContain("x7");
    expect(names[1]).toContain("Second");
  });
});
