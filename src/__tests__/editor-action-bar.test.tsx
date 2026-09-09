import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const exportNodeToPngMock = vi.fn();
const downloadDataUrlMock = vi.fn();

vi.mock("@/lib/export-png", async () => {
  const actual = await vi.importActual<typeof import("@/lib/export-png")>("@/lib/export-png");
  return {
    ...actual,
    exportNodeToPng: (...args: unknown[]) => exportNodeToPngMock(...args),
    downloadDataUrl: (...args: unknown[]) => downloadDataUrlMock(...args),
  };
});

const { EditorActionBar } = await import("@/components/editor/EditorActionBar");

function mockSession(authenticated: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => (authenticated ? { user: { name: "Lucas" } } : {}),
    })
  );
}

function renderBar(overrides: Partial<React.ComponentProps<typeof EditorActionBar>> = {}) {
  const ref = createRef<HTMLDivElement>();
  const onSave = vi.fn().mockResolvedValue(undefined);
  const utils = render(
    <div>
      <div ref={ref}>
        <div id="capture-root" />
      </div>
      <EditorActionBar
        buildName="Bruiser de Frontline"
        filledCount={3}
        totalSlots={9}
        hasReadyItem={true}
        captureNodeRef={ref}
        onSave={onSave}
        {...overrides}
      />
    </div>
  );
  return { ref, onSave, ...utils };
}

describe("EditorActionBar (ACM-037 AC#2, AC#5, AC#6)", () => {
  beforeEach(() => {
    exportNodeToPngMock.mockReset();
    downloadDataUrlMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("disables Salvar with a reason when the build has no name", () => {
    mockSession(true);
    render(
      <EditorActionBar
        buildName=""
        filledCount={0}
        totalSlots={9}
        hasReadyItem={false}
        captureNodeRef={createRef()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Salvar" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Dê um nome pra build")).toBeInTheDocument();
  });

  it("disables Salvar and Exportar with a zero-slots build (ACM-092 revised spec)", () => {
    mockSession(true);
    renderBar({ filledCount: 0, totalSlots: 9, hasReadyItem: false });

    expect(screen.getByRole("button", { name: "Salvar" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Exportar PNG" })).toBeDisabled();
    expect(screen.getByText("Equipe pelo menos um item com as habilidades preenchidas")).toBeInTheDocument();
  });

  it("disables Salvar and Exportar when only non-selectable items (cape/bag/mount/food/potion) are equipped", () => {
    mockSession(true);
    renderBar({ filledCount: 5, totalSlots: 9, hasReadyItem: false });

    expect(screen.getByRole("button", { name: "Salvar" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Exportar PNG" })).toBeDisabled();
  });

  it("enables Salvar and Exportar once a mainhand weapon has its spells filled", async () => {
    mockSession(true);
    exportNodeToPngMock.mockResolvedValue("data:image/png;base64,AAAA");
    const { onSave } = renderBar({ filledCount: 1, totalSlots: 9, hasReadyItem: true });

    expect(screen.getByRole("button", { name: "Salvar" })).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByRole("button", { name: "Exportar PNG" })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Build salva.")).toBeInTheDocument();
  });

  it("calls onSave when authenticated and shows the saved state", async () => {
    mockSession(true);
    const { onSave } = renderBar();

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Build salva.")).toBeInTheDocument();
  });

  it("gates the save behind an auth panel instead of saving when unauthenticated", async () => {
    mockSession(false);
    const { onSave } = renderBar();

    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() =>
      expect(screen.getByText("Entre para salvar esta build. Ela não será perdida.")).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Agora não" }));
    expect(screen.queryByText("Entre para salvar esta build. Ela não será perdida.")).not.toBeInTheDocument();
  });

  it("exports the PNG from #capture-root when Exportar PNG is clicked", async () => {
    mockSession(true);
    exportNodeToPngMock.mockResolvedValue("data:image/png;base64,AAAA");
    renderBar();

    fireEvent.click(screen.getByRole("button", { name: "Exportar PNG" }));

    await waitFor(() =>
      expect(downloadDataUrlMock).toHaveBeenCalledWith(
        "data:image/png;base64,AAAA",
        "bruiser-de-frontline.png"
      )
    );
  });

  it("shows the slot counter with the migrated testid", () => {
    mockSession(true);
    renderBar({ filledCount: 4, totalSlots: 9 });
    expect(screen.getByTestId("slot-count")).toHaveTextContent("4/9");
  });

  it("hides the decorative slot counter on narrow screens so the status text isn't squeezed (390px review finding)", () => {
    mockSession(true);
    renderBar({ buildName: "", filledCount: 0, totalSlots: 9 });
    const status = screen.getByText("Dê um nome pra build");
    expect(status.className).not.toMatch(/truncate/);
    expect(screen.getByTestId("slot-count").className).toMatch(/hidden/);
  });

  describe("structural invariant: never a positioned ancestor of #capture-root", () => {
    it("is rendered as a sibling of the preview wrapper, not a wrapper around it", () => {
      const { container } = renderBar();
      const captureRoot = container.querySelector("#capture-root");
      const actionBar = container.querySelector('[data-testid="editor-action-bar"]');
      expect(captureRoot).toBeTruthy();
      expect(actionBar).toBeTruthy();
      expect(captureRoot!.contains(actionBar)).toBe(false);
      expect(actionBar!.contains(captureRoot)).toBe(false);
    });
  });
});
