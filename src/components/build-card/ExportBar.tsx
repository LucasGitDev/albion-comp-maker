"use client";

import { useCallback, useRef, useState } from "react";
import {
  ExportUnsupportedError,
  buildExportFilename,
  downloadDataUrl,
  exportNodeToClipboard,
  exportNodeToPng,
  isClipboardImageSupported,
} from "@/lib/export-png";

export type ExportBarProps = {
  /**
   * Ref to a wrapper around the BuildCard preview (never the interactive
   * editor tree). The actual capture node is resolved via
   * `#capture-root` inside it, per decision-010 — this component never
   * renders inside that subtree, only reads it.
   */
  captureNodeRef: React.RefObject<HTMLElement | null>;
  /** Used to derive the downloaded file's name. */
  buildName: string;
};

function resolveCaptureNode(container: HTMLElement | null): HTMLElement | null {
  if (container === null) return null;
  if (container.id === "capture-root") return container;
  return container.querySelector<HTMLElement>("#capture-root");
}

type ExportStatus =
  | { kind: "idle" }
  | { kind: "busy"; action: "download" | "copy" }
  | { kind: "success"; action: "download" | "copy" }
  | { kind: "error"; message: string };

/**
 * Sibling control bar for the BuildCard preview (decision-010): buttons live
 * OUTSIDE `#capture-root` and only ever read the node through a ref, never
 * rendering inside the capture tree.
 */
export function ExportBar({ captureNodeRef, buildName }: ExportBarProps): React.JSX.Element {
  const [status, setStatus] = useState<ExportStatus>({ kind: "idle" });
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipboardSupported = isClipboardImageSupported();

  const scheduleReset = useCallback((next: ExportStatus) => {
    setStatus(next);
    if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus({ kind: "idle" }), 2500);
  }, []);

  const handleDownload = useCallback(async () => {
    const node = resolveCaptureNode(captureNodeRef.current);
    if (node === null) {
      scheduleReset({ kind: "error", message: "Card não está pronto para exportar." });
      return;
    }
    setStatus({ kind: "busy", action: "download" });
    try {
      const dataUrl = await exportNodeToPng(node);
      downloadDataUrl(dataUrl, buildExportFilename(buildName));
      scheduleReset({ kind: "success", action: "download" });
    } catch (error) {
      scheduleReset({
        kind: "error",
        message: error instanceof Error ? error.message : "Falha ao exportar PNG.",
      });
    }
  }, [buildName, captureNodeRef, scheduleReset]);

  const handleCopy = useCallback(async () => {
    const node = resolveCaptureNode(captureNodeRef.current);
    if (node === null) {
      scheduleReset({ kind: "error", message: "Card não está pronto para exportar." });
      return;
    }
    setStatus({ kind: "busy", action: "copy" });
    try {
      await exportNodeToClipboard(node);
      scheduleReset({ kind: "success", action: "copy" });
    } catch (error) {
      if (error instanceof ExportUnsupportedError) {
        // Real fallback, not a silent no-op (task requirement): if the
        // Clipboard/ClipboardItem API is unavailable or the write is
        // denied, fall back to a download so the user still gets the PNG.
        try {
          const dataUrl = await exportNodeToPng(node);
          downloadDataUrl(dataUrl, buildExportFilename(buildName));
          scheduleReset({ kind: "success", action: "download" });
        } catch (downloadError) {
          scheduleReset({
            kind: "error",
            message: downloadError instanceof Error ? downloadError.message : "Falha ao exportar PNG.",
          });
        }
        return;
      }
      scheduleReset({
        kind: "error",
        message: error instanceof Error ? error.message : "Falha ao copiar PNG.",
      });
    }
  }, [buildName, captureNodeRef, scheduleReset]);

  const isBusy = status.kind === "busy";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isBusy}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 [@media(hover:none)]:hover:bg-blue-600"
      >
        {status.kind === "busy" && status.action === "download" ? "Exportando…" : "Baixar PNG"}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        disabled={isBusy}
        title={clipboardSupported ? undefined : "Não suportado neste navegador — vai baixar o arquivo"}
        className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-colors duration-150 ease-out hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60 [@media(hover:none)]:hover:bg-white"
      >
        {status.kind === "busy" && status.action === "copy" ? "Copiando…" : "Copiar para área de transferência"}
      </button>
      <span role="status" aria-live="polite" className="text-sm">
        {status.kind === "success" && status.action === "download" && "PNG baixado."}
        {status.kind === "success" && status.action === "copy" && "Copiado."}
        {status.kind === "error" && status.message}
      </span>
    </div>
  );
}
