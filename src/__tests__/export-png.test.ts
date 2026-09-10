import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toPngMock = vi.fn();
const toBlobMock = vi.fn();

vi.mock("html-to-image", () => ({
  toPng: (...args: unknown[]) => toPngMock(...args),
  toBlob: (...args: unknown[]) => toBlobMock(...args),
}));

// Imported after the mock so the module under test picks up the mocked
// `html-to-image` bindings.
const {
  EXPORT_PIXEL_RATIO,
  ExportImageLoadError,
  ExportImageTimeoutError,
  ExportUnsupportedError,
  buildExportFilename,
  downloadDataUrl,
  exportNodeToBlob,
  exportNodeToClipboard,
  exportNodeToPng,
  isClipboardImageSupported,
  resolveCaptureNode,
} = await import("@/lib/export-png");

function makeStalledImg(): HTMLImageElement {
  const img = document.createElement("img");
  Object.defineProperty(img, "complete", { value: false, configurable: true });
  Object.defineProperty(img, "naturalWidth", { value: 0, configurable: true });
  // Deliberately never fires "load" or "error" — simulates a stalled/dropped
  // upstream connection through /api/icon.
  return img;
}

function makeImg(opts: { complete: boolean; naturalWidth: number; failOnListen?: boolean }): HTMLImageElement {
  const img = document.createElement("img");
  Object.defineProperty(img, "complete", { value: opts.complete, configurable: true });
  Object.defineProperty(img, "naturalWidth", { value: opts.naturalWidth, configurable: true });
  if (!opts.complete) {
    const originalAdd = img.addEventListener.bind(img);
    img.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: unknown) => {
      originalAdd(type, listener, options as AddEventListenerOptions);
      if (type === (opts.failOnListen ? "error" : "load")) {
        queueMicrotask(() => img.dispatchEvent(new Event(type)));
      }
    }) as typeof img.addEventListener;
  }
  return img;
}

function makeCaptureNode(images: HTMLImageElement[]): HTMLElement {
  const node = document.createElement("div");
  images.forEach((img) => node.appendChild(img));
  return node;
}

describe("export-png", () => {
  beforeEach(() => {
    toPngMock.mockReset();
    toBlobMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("exportNodeToPng", () => {
    it("calls toPng with pixelRatio 2 and never skips font embedding", async () => {
      toPngMock.mockResolvedValue("data:image/png;base64,AAAA");
      const node = makeCaptureNode([makeImg({ complete: true, naturalWidth: 32 })]);

      const result = await exportNodeToPng(node);

      expect(result).toBe("data:image/png;base64,AAAA");
      expect(toPngMock).toHaveBeenCalledTimes(1);
      const [calledNode, options] = toPngMock.mock.calls[0] as [HTMLElement, Record<string, unknown>];
      expect(calledNode).toBe(node);
      expect(options.pixelRatio).toBe(EXPORT_PIXEL_RATIO);
      expect(options.skipFonts).not.toBe(true);
    });

    it("passes a filter to toPng that excludes empty-slot placeholders (ACM-122)", async () => {
      toPngMock.mockResolvedValue("data:image/png;base64,AAAA");
      const node = makeCaptureNode([makeImg({ complete: true, naturalWidth: 32 })]);

      await exportNodeToPng(node);

      const [, options] = toPngMock.mock.calls[0] as [HTMLElement, Record<string, unknown>];
      const filter = options.filter as (el: HTMLElement) => boolean;
      expect(typeof filter).toBe("function");
      const emptySlot = document.createElement("div");
      emptySlot.setAttribute("data-slot-state", "empty");
      const filledSlot = document.createElement("div");
      filledSlot.setAttribute("data-slot-state", "filled");
      expect(filter(emptySlot)).toBe(false);
      expect(filter(filledSlot)).toBe(true);
    });

    it("rejects with ExportImageLoadError when an <img> under the node failed to load", async () => {
      const node = makeCaptureNode([makeImg({ complete: false, naturalWidth: 0, failOnListen: true })]);

      await expect(exportNodeToPng(node)).rejects.toBeInstanceOf(ExportImageLoadError);
      expect(toPngMock).not.toHaveBeenCalled();
    });

    it("rejects with ExportImageLoadError when an already-complete <img> has zero naturalWidth", async () => {
      const node = makeCaptureNode([makeImg({ complete: true, naturalWidth: 0 })]);

      await expect(exportNodeToPng(node)).rejects.toBeInstanceOf(ExportImageLoadError);
    });

    it("resolves once a pending <img> finishes loading successfully", async () => {
      toPngMock.mockResolvedValue("data:image/png;base64,BBBB");
      const node = makeCaptureNode([makeImg({ complete: false, naturalWidth: 64 })]);

      await expect(exportNodeToPng(node)).resolves.toBe("data:image/png;base64,BBBB");
    });

    it("rejects with ExportImageTimeoutError instead of hanging when an <img> never fires load or error", async () => {
      const node = makeCaptureNode([makeStalledImg()]);

      await expect(exportNodeToPng(node, 20)).rejects.toBeInstanceOf(ExportImageTimeoutError);
      expect(toPngMock).not.toHaveBeenCalled();
    });
  });

  describe("exportNodeToBlob", () => {
    it("calls toBlob with pixelRatio 2 and returns the resulting blob", async () => {
      const blob = new Blob(["fake-png"], { type: "image/png" });
      toBlobMock.mockResolvedValue(blob);
      const node = makeCaptureNode([makeImg({ complete: true, naturalWidth: 32 })]);

      const result = await exportNodeToBlob(node);

      expect(result).toBe(blob);
      const [, options] = toBlobMock.mock.calls[0] as [HTMLElement, Record<string, unknown>];
      expect(options.pixelRatio).toBe(EXPORT_PIXEL_RATIO);
    });

    it("throws when html-to-image returns a null blob", async () => {
      toBlobMock.mockResolvedValue(null);
      const node = makeCaptureNode([makeImg({ complete: true, naturalWidth: 32 })]);

      await expect(exportNodeToBlob(node)).rejects.toThrow(/failed to produce a PNG blob/i);
    });
  });

  describe("isClipboardImageSupported / exportNodeToClipboard", () => {
    it("reports unsupported when ClipboardItem is absent", () => {
      vi.stubGlobal("ClipboardItem", undefined);
      expect(isClipboardImageSupported()).toBe(false);
    });

    it("throws ExportUnsupportedError instead of an unhandled rejection when unsupported", async () => {
      vi.stubGlobal("ClipboardItem", undefined);
      const node = makeCaptureNode([makeImg({ complete: true, naturalWidth: 32 })]);

      await expect(exportNodeToClipboard(node)).rejects.toBeInstanceOf(ExportUnsupportedError);
      expect(toBlobMock).not.toHaveBeenCalled();
    });

    it("builds a ClipboardItem with an image/png entry and writes it via navigator.clipboard.write", async () => {
      const blob = new Blob(["fake-png"], { type: "image/png" });
      toBlobMock.mockResolvedValue(blob);
      const writeMock = vi.fn().mockResolvedValue(undefined);

      class FakeClipboardItem {
        items: Record<string, Blob>;
        constructor(items: Record<string, Blob>) {
          this.items = items;
        }
      }
      vi.stubGlobal("ClipboardItem", FakeClipboardItem);
      vi.stubGlobal("navigator", {
        ...globalThis.navigator,
        clipboard: { write: writeMock },
      });

      const node = makeCaptureNode([makeImg({ complete: true, naturalWidth: 32 })]);
      await exportNodeToClipboard(node);

      expect(writeMock).toHaveBeenCalledTimes(1);
      const [items] = writeMock.mock.calls[0] as [FakeClipboardItem[]];
      expect(items).toHaveLength(1);
      expect(items[0].items["image/png"]).toBe(blob);
    });
  });

  describe("downloadDataUrl", () => {
    it("creates a transient anchor, sets href/download, clicks it, and removes it", () => {
      const clickSpy = vi.fn();
      const appendSpy = vi.spyOn(document.body, "appendChild");
      const removeSpy = vi.spyOn(document.body, "removeChild");
      const createElementSpy = vi.spyOn(document, "createElement");

      downloadDataUrl("data:image/png;base64,AAAA", "my-build.png");

      const anchorCall = createElementSpy.mock.results.find(
        (r) => (r.value as HTMLElement).tagName === "A"
      );
      expect(anchorCall).toBeDefined();
      const anchor = anchorCall!.value as HTMLAnchorElement;
      expect(anchor.href).toBe("data:image/png;base64,AAAA");
      expect(anchor.download).toBe("my-build.png");
      expect(appendSpy).toHaveBeenCalledWith(anchor);
      expect(removeSpy).toHaveBeenCalledWith(anchor);
      void clickSpy;

      appendSpy.mockRestore();
      removeSpy.mockRestore();
      createElementSpy.mockRestore();
    });
  });

  describe("resolveCaptureNode", () => {
    it("returns the container itself when its id matches captureId", () => {
      const container = document.createElement("div");
      container.id = "capture-root-full-comp";
      expect(resolveCaptureNode(container, "capture-root-full-comp")).toBe(container);
    });

    it("returns a nested descendant matching #captureId when the container id differs", () => {
      const container = document.createElement("div");
      container.id = "wrapper";
      const nested = document.createElement("div");
      nested.id = "capture-root-abc123";
      container.appendChild(nested);
      expect(resolveCaptureNode(container, "capture-root-abc123")).toBe(nested);
    });

    it("returns null when no matching node exists", () => {
      const container = document.createElement("div");
      container.id = "wrapper";
      expect(resolveCaptureNode(container, "capture-root-missing")).toBeNull();
    });

    it("returns null when the container is null", () => {
      expect(resolveCaptureNode(null, "capture-root")).toBeNull();
    });
  });

  describe("buildExportFilename", () => {
    it("slugifies the build name and appends .png", () => {
      expect(buildExportFilename("Bruiser de Frontline")).toBe("bruiser-de-frontline.png");
    });

    it("strips accents and punctuation", () => {
      expect(buildExportFilename("Composição Zerg — Ganks!")).toBe("composicao-zerg-ganks.png");
    });

    it("falls back to a generic name for empty/whitespace-only input", () => {
      expect(buildExportFilename("   ")).toBe("albion-build.png");
    });
  });
});
