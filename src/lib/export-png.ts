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

/**
 * Icons load through `/api/icon`, which proxies to render.albiononline.com.
 * A stalled/dropped upstream connection fires neither `load` nor `error`,
 * so waiting on those events alone can hang forever (see ACM-015 review).
 * This timeout bounds that wait so the export always settles instead of
 * leaving the UI stuck in `busy` with no recovery path.
 */
export class ExportImageTimeoutError extends Error {
  constructor(message = "Timed out waiting for icons to load. Check your connection and try again.") {
    super(message);
    this.name = "ExportImageTimeoutError";
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
/**
 * Default per-image wait timeout: 8000ms. Chosen to comfortably cover a slow
 * but *live* `/api/icon` round trip (icons are small, same-origin, typically
 * sub-second) while still bounding a stalled/dropped upstream connection to
 * a single-digit-seconds wait instead of forever.
 */
export const DEFAULT_IMAGE_LOAD_TIMEOUT_MS = 8000;

function waitForImage(img: HTMLImageElement, timeoutMs: number): Promise<boolean> {
  if (img.complete) {
    return Promise.resolve(img.naturalWidth > 0);
  }
  return new Promise<boolean>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
      clearTimeout(timer);
    };
    const onLoad = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(true);
    };
    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(false);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new ExportImageTimeoutError());
    }, timeoutMs);
    img.addEventListener("load", onLoad, { once: true });
    img.addEventListener("error", onError, { once: true });
  });
}

async function waitForImages(
  node: HTMLElement,
  timeoutMs: number = DEFAULT_IMAGE_LOAD_TIMEOUT_MS
): Promise<void> {
  const images = Array.from(node.querySelectorAll("img"));
  const results = await Promise.all(images.map((img) => waitForImage(img, timeoutMs)));

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
export async function exportNodeToPng(
  node: HTMLElement,
  imageTimeoutMs: number = DEFAULT_IMAGE_LOAD_TIMEOUT_MS
): Promise<string> {
  await waitForImages(node, imageTimeoutMs);
  return toPng(node, { pixelRatio: EXPORT_PIXEL_RATIO, cacheBust: true });
}

/**
 * Renders `node` to a PNG Blob at `EXPORT_PIXEL_RATIO` for clipboard writes.
 */
export async function exportNodeToBlob(
  node: HTMLElement,
  imageTimeoutMs: number = DEFAULT_IMAGE_LOAD_TIMEOUT_MS
): Promise<Blob> {
  await waitForImages(node, imageTimeoutMs);
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
export async function exportNodeToClipboard(
  node: HTMLElement,
  imageTimeoutMs: number = DEFAULT_IMAGE_LOAD_TIMEOUT_MS
): Promise<void> {
  if (!isClipboardImageSupported()) {
    throw new ExportUnsupportedError(
      "Clipboard image copy is not supported in this browser. Use Download instead."
    );
  }
  const blob = await exportNodeToBlob(node, imageTimeoutMs);
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

/**
 * Resolves the capture DOM node from a wrapper ref, given the `id` the
 * capture root was rendered with (decision-030). A build card's capture
 * root can either be the ref'd element itself (the common single-card
 * case, `captureId="capture-root"`) or a nested descendant identified by
 * `captureId` (e.g. a per-entry `capture-root-{compBuildId}` inside a
 * shared comp-wide container ref, ACM-020). This is the single source of
 * truth for that lookup — `ExportBar` and `EditorActionBar` both delegate
 * to it instead of duplicating the literal `#capture-root` selector.
 */
export function resolveCaptureNode(
  container: HTMLElement | null,
  captureId: string
): HTMLElement | null {
  if (container === null) return null;
  if (container.id === captureId) return container;
  return container.querySelector<HTMLElement>("#" + CSS.escape(captureId));
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
