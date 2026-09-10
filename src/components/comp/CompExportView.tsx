"use client";

import { useCallback, useRef, useState } from "react";
import { ExportBar } from "@/components/build-card/ExportBar";
import {
  buildExportFilename,
  downloadDataUrl,
  exportNodeToPng,
  resolveCaptureNode,
} from "@/lib/export-png";

export type CompExportViewEntry = {
  compBuildId: string;
  buildName: string;
};

export type CompExportViewProps = {
  compName: string;
  entries: CompExportViewEntry[];
  children: React.ReactNode;
};

const FULL_COMP_CAPTURE_ID = "capture-root-full-comp";

type FullExportStatus =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "success" }
  | { kind: "error"; message: string };

/**
 * ACM-020 (decision-030): public `/comp/[slug]` export surface. Wraps the
 * server-rendered `BuildCard` grid (`children`) in a single container ref
 * shared by every export control — the full-comp button captures the
 * container itself (`id="capture-root-full-comp"`), and one `ExportBar`
 * per entry captures its own nested `capture-root-{compBuildId}` node
 * (already rendered by each `BuildCard`) through the same ref. No ZIP:
 * per-build export is always an individual download click (AC#2).
 */
export function CompExportView({ compName, entries, children }: CompExportViewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<FullExportStatus>({ kind: "idle" });
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleReset = useCallback((next: FullExportStatus) => {
    setStatus(next);
    if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus({ kind: "idle" }), 2500);
  }, []);

  const handleDownloadFullComp = useCallback(async () => {
    const node = resolveCaptureNode(containerRef.current, FULL_COMP_CAPTURE_ID);
    if (node === null) {
      scheduleReset({ kind: "error", message: "Comp não está pronta para exportar." });
      return;
    }
    setStatus({ kind: "busy" });
    try {
      const dataUrl = await exportNodeToPng(node);
      downloadDataUrl(dataUrl, buildExportFilename(compName));
      scheduleReset({ kind: "success" });
    } catch (error) {
      scheduleReset({
        kind: "error",
        message: error instanceof Error ? error.message : "Falha ao exportar PNG.",
      });
    }
  }, [compName, scheduleReset]);

  const isBusy = status.kind === "busy";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleDownloadFullComp()}
          disabled={isBusy}
          className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 ease-out hover:bg-[var(--color-icon-slot)] disabled:cursor-not-allowed disabled:opacity-60 [@media(hover:none)]:hover:bg-transparent"
        >
          {isBusy ? "Exportando…" : "Baixar comp completa (PNG)"}
        </button>
        <span
          role="status"
          aria-live="polite"
          className={
            status.kind === "error"
              ? "text-sm text-[var(--color-icon-error-fg)]"
              : "text-sm text-foreground/70"
          }
        >
          {status.kind === "success" && "PNG baixado."}
          {status.kind === "error" && status.message}
        </span>
      </div>
      <div ref={containerRef} id={FULL_COMP_CAPTURE_ID}>
        {children}
      </div>
      <div className="flex flex-col gap-3">
        {entries.map((entry) => (
          <div key={entry.compBuildId} className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground/80">{entry.buildName}</span>
            <ExportBar
              captureNodeRef={containerRef}
              buildName={entry.buildName}
              captureId={`capture-root-${entry.compBuildId}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
