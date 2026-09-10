import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exportNodeToPngMock = vi.fn();
const downloadDataUrlMock = vi.fn();
const isClipboardImageSupportedMock = vi.fn();
const exportNodeToClipboardMock = vi.fn();

vi.mock("@/lib/export-png", async () => {
  const actual = await vi.importActual<typeof import("@/lib/export-png")>("@/lib/export-png");
  return {
    ...actual,
    exportNodeToPng: (...args: unknown[]) => exportNodeToPngMock(...args),
    exportNodeToClipboard: (...args: unknown[]) => exportNodeToClipboardMock(...args),
    isClipboardImageSupported: () => isClipboardImageSupportedMock(),
    downloadDataUrl: (...args: unknown[]) => downloadDataUrlMock(...args),
  };
});

const { CompExportView } = await import("@/components/comp/CompExportView");

function renderView() {
  return render(
    <CompExportView
      compName="Comp de Ganks"
      entries={[
        { compBuildId: "entry-1", buildName: "Frontline" },
        { compBuildId: "entry-2", buildName: "Healer" },
      ]}
    >
      <div id="capture-root-entry-1">frontline</div>
      <div id="capture-root-entry-2">healer</div>
    </CompExportView>
  );
}

describe("CompExportView", () => {
  beforeEach(() => {
    exportNodeToPngMock.mockReset();
    downloadDataUrlMock.mockReset();
    isClipboardImageSupportedMock.mockReset().mockReturnValue(true);
    exportNodeToClipboardMock.mockReset();
  });

  it("captures the full-comp container id when downloading the whole comp", async () => {
    exportNodeToPngMock.mockResolvedValue("data:image/png;base64,FULL");
    renderView();

    fireEvent.click(screen.getByText("Baixar comp completa (PNG)"));

    await waitFor(() =>
      expect(downloadDataUrlMock).toHaveBeenCalledWith("data:image/png;base64,FULL", "comp-de-ganks.png")
    );
    const [node] = exportNodeToPngMock.mock.calls[0] as [HTMLElement];
    expect(node.id).toBe("capture-root-full-comp");
    expect(node.querySelector("#capture-root-entry-1")).not.toBeNull();
    expect(node.querySelector("#capture-root-entry-2")).not.toBeNull();
  });

  it("resolves each entry's own capture root, not the full-comp root", async () => {
    exportNodeToPngMock.mockResolvedValue("data:image/png;base64,ENTRY1");
    renderView();

    const downloadButtons = screen.getAllByText("Baixar PNG");
    fireEvent.click(downloadButtons[0]);

    await waitFor(() =>
      expect(downloadDataUrlMock).toHaveBeenCalledWith("data:image/png;base64,ENTRY1", "frontline.png")
    );
    const [node] = exportNodeToPngMock.mock.calls[0] as [HTMLElement];
    expect(node.id).toBe("capture-root-entry-1");
  });

  it("resolves the second entry's own capture root independently", async () => {
    exportNodeToPngMock.mockResolvedValue("data:image/png;base64,ENTRY2");
    renderView();

    const downloadButtons = screen.getAllByText("Baixar PNG");
    fireEvent.click(downloadButtons[1]);

    await waitFor(() =>
      expect(downloadDataUrlMock).toHaveBeenCalledWith("data:image/png;base64,ENTRY2", "healer.png")
    );
    const [node] = exportNodeToPngMock.mock.calls[0] as [HTMLElement];
    expect(node.id).toBe("capture-root-entry-2");
  });
});
