import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const exportNodeToPngMock = vi.fn();
const exportNodeToClipboardMock = vi.fn();
const isClipboardImageSupportedMock = vi.fn();
const downloadDataUrlMock = vi.fn();

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

const { ExportBar } = await import("@/components/build-card/ExportBar");
const { ExportUnsupportedError } = await import("@/lib/export-png");

function renderBar() {
  const ref = createRef<HTMLDivElement>();
  const utils = render(
    <div>
      <div ref={ref}>
        <div id="capture-root" />
      </div>
      <ExportBar captureNodeRef={ref} buildName="Bruiser de Frontline" />
    </div>
  );
  return { ref, ...utils };
}

describe("ExportBar", () => {
  beforeEach(() => {
    exportNodeToPngMock.mockReset();
    exportNodeToClipboardMock.mockReset();
    isClipboardImageSupportedMock.mockReset().mockReturnValue(true);
    downloadDataUrlMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves #capture-root inside the ref and downloads the exported PNG", async () => {
    exportNodeToPngMock.mockResolvedValue("data:image/png;base64,AAAA");
    renderBar();

    fireEvent.click(screen.getByText("Baixar PNG"));

    await waitFor(() => expect(downloadDataUrlMock).toHaveBeenCalledWith(
      "data:image/png;base64,AAAA",
      "bruiser-de-frontline.png"
    ));
    expect(exportNodeToPngMock).toHaveBeenCalledTimes(1);
    const [node] = exportNodeToPngMock.mock.calls[0] as [HTMLElement];
    expect(node.id).toBe("capture-root");
  });

  it("copies to clipboard when supported", async () => {
    exportNodeToClipboardMock.mockResolvedValue(undefined);
    renderBar();

    fireEvent.click(screen.getByText("Copiar para área de transferência"));

    await waitFor(() => expect(exportNodeToClipboardMock).toHaveBeenCalledTimes(1));
    expect(downloadDataUrlMock).not.toHaveBeenCalled();
  });

  it("falls back to download when the clipboard copy is unsupported", async () => {
    isClipboardImageSupportedMock.mockReturnValue(false);
    exportNodeToClipboardMock.mockRejectedValue(new ExportUnsupportedError("nope"));
    exportNodeToPngMock.mockResolvedValue("data:image/png;base64,BBBB");
    renderBar();

    fireEvent.click(screen.getByText("Copiar para área de transferência"));

    await waitFor(() => expect(downloadDataUrlMock).toHaveBeenCalledWith(
      "data:image/png;base64,BBBB",
      "bruiser-de-frontline.png"
    ));
  });

  it("shows an error message without throwing when export fails for another reason", async () => {
    exportNodeToPngMock.mockRejectedValue(new Error("boom"));
    renderBar();

    fireEvent.click(screen.getByText("Baixar PNG"));

    expect(await screen.findByText("boom")).toBeInTheDocument();
  });

  describe("structural invariant: never a descendant of #capture-root", () => {
    /**
     * ExportBar uses Tailwind palette utilities (bg-blue-600, etc.) that
     * compile to oklch(), which html-to-image cannot rasterize
     * (decision-007). Today this is safe only because nothing wires
     * ExportBar into #capture-root — this test turns that convention into
     * an enforced structural check, so a future wiring change that nests it
     * there fails loudly instead of silently poisoning every export.
     */
    function assertNeverInsideCaptureRoot(container: HTMLElement) {
      const captureRoot = container.querySelector("#capture-root");
      expect(captureRoot).toBeTruthy();
      expect(captureRoot!.querySelector("button")).toBeNull();
      const exportButton = container.querySelector("button");
      expect(exportButton).not.toBeNull();
      expect(captureRoot!.contains(exportButton)).toBe(false);
    }

    it("passes when ExportBar is rendered as a sibling of #capture-root (correct wiring)", () => {
      const { container } = renderBar();
      assertNeverInsideCaptureRoot(container);
    });

    it("fails the invariant check when ExportBar is nested inside #capture-root (regression fixture)", () => {
      const ref = createRef<HTMLDivElement>();
      const { container } = render(
        <div ref={ref}>
          <div id="capture-root">
            <ExportBar captureNodeRef={ref} buildName="Bruiser de Frontline" />
          </div>
        </div>
      );

      expect(() => assertNeverInsideCaptureRoot(container)).toThrow();
    });
  });
});
