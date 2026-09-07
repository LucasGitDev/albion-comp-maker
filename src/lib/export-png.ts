import { toBlob, toPng } from "html-to-image";

/**
 * Discord-ready export resolution multiplier (RF-8 / ACM-015 AC#1). Fixed at
 * 2x so output is deterministic and reproducible regardless of the device
 * pixel ratio of whoever clicks the button.
 */
export const EXPORT_PIXEL_RATIO = 2;

export class ExportImageLoadError extends Error {
  constructor(message = "Some images in the card have not finished loading yet.") {
    super(message);
    this.name = "ExportImageLoadError";
  }
}

export class ExportUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportUnsupportedError";
  }
}

/**
 * html-to-image inlines whatever `<img>.src` is currently loaded into the
 * cloned node. If an icon is still mid-fetch (e.g. the user clicks Export
 * immediately after the card mounts), the export would silently omit that
 * icon rather than error — see ACM-015 notes on cross-origin/loading being
 * the #1 cause of blank exports. `/api/icon` is same-origin (decision-007),
 * so the only remaining risk here is *timing*, not CORS: wait for every
 * `<img>` under the node to finish loading (or fail) before rasterizing, and
 * throw explicitly if any image failed rather than exporting a half-empty
 * card.
 */
async function waitForImages(node: HTMLElement): Promise<void> {
  const images = Array.from(node.querySelectorAll("img"));
  const results = await Promise.all(
    images.map((img) => {
      if (img.complete) {
        return Promise.resolve(img.naturalWidth > 0);
      }
      return new Promise<boolean>((resolve) => {
        img.addEventListener("load", () => resolve(true), { once: true });
        img.addEventListener("error", () => resolve(false), { once: true });
      });
    })
  );

  if (results.some((ok) => !ok)) {
    throw new ExportImageLoadError();
  }
}

/**
 * Renders `node` (the BuildCard `#capture-root`) to a PNG data URL at
 * `EXPORT_PIXEL_RATIO`. Webfonts are embedded automatically: html-to-image's
 * `toPng`/`toBlob` call `getFontEmbedCSS` internally and inline the result
 * unless `skipFonts` is set (it never is here), so the exported PNG never
 * depends on the browser having the font rasterized at capture time
 * (ACM-015 AC#4).
 */
export async function exportNodeToPng(node: HTMLElement): Promise<string> {
  await waitForImages(node);
  return toPng(node, { pixelRatio: EXPORT_PIXEL_RATIO, cacheBust: true });
}

/**
 * Renders `node` to a PNG Blob at `EXPORT_PIXEL_RATIO` for clipboard writes.
 */
export async function exportNodeToBlob(node: HTMLElement): Promise<Blob> {
  await waitForImages(node);
  const blob = await toBlob(node, { pixelRatio: EXPORT_PIXEL_RATIO, cacheBust: true });
  if (blob === null) {
    throw new Error("html-to-image failed to produce a PNG blob.");
  }
  return blob;
}

/**
 * Triggers a browser download of `dataUrl` as `filename` via a transient
 * anchor element.
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/** True when the Clipboard API + ClipboardItem (Chrome/Edge, secure context) is available. */
export function isClipboardImageSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.ClipboardItem !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard !== "undefined" &&
    typeof navigator.clipboard.write === "function"
  );
}

/**
 * Copies `node`'s PNG export to the clipboard (Chrome/Edge, secure context,
 * user-gesture only — AC#2). Throws `ExportUnsupportedError` if the
 * Clipboard/ClipboardItem API is unavailable; callers should catch this and
 * fall back to `exportNodeToPng` + `downloadDataUrl` rather than silently
 * doing nothing.
 */
export async function exportNodeToClipboard(node: HTMLElement): Promise<void> {
  if (!isClipboardImageSupported()) {
    throw new ExportUnsupportedError(
      "Clipboard image copy is not supported in this browser. Use Download instead."
    );
  }
  const blob = await exportNodeToBlob(node);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

/** Derives a safe filename from the build name, falling back to a generic name. */
export function buildExportFilename(buildName: string): string {
  const slug = buildName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "albion-build"}.png`;
}
