"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { buildExportFilename, downloadDataUrl, exportNodeToPng } from "@/lib/export-png";

export type EditorActionBarProps = {
  buildName: string;
  filledCount: number;
  totalSlots: number;
  /**
   * ACM-092 (revised spec): Salvar and Exportar PNG both require at least one
   * equipped item that (a) has ≥1 selectable spell slot AND (b) has every one
   * of those selectable slots filled. Cape/bag/mount/food/potion never expose
   * a selectable slot post-ACM-090, so equipping only those never satisfies
   * this — the caller (the page owning `spellCandidatesBySlot`, the same
   * per-item selectable-group source `SlotCard` already reads) computes this,
   * `EditorActionBar` only gates on the resulting boolean.
   */
  hasReadyItem: boolean;
  /**
   * Sibling of the (future) preview wrapper — this component only *reads*
   * `#capture-root` through the ref, it never renders inside it (decision-010,
   * ACM-029). Resolution mirrors `ExportBar.resolveCaptureNode`.
   */
  captureNodeRef: React.RefObject<HTMLElement | null>;
  /**
   * Persists the build. Left to the caller because ACM-018/019 (Server
   * Actions + `/builds` persistence) are out of this task's scope — this
   * component owns the save *state machine* and the auth gate, not the
   * storage mechanism.
   */
  onSave: () => Promise<void>;
  /**
   * ACM-014: renders the "Aparência" ghost toggle, to the left of
   * "Exportar PNG" (doc-007 D2 — tema is a tertiary action, never accent).
   * Omitted entirely when not provided, so callers that don't have a theme
   * panel yet keep the exact previous 2-button layout.
   */
  themePanelOpen?: boolean;
  onToggleThemePanel?: () => void;
};

function resolveCaptureNode(container: HTMLElement | null): HTMLElement | null {
  if (container === null) return null;
  if (container.id === "capture-root") return container;
  return container.querySelector<HTMLElement>("#capture-root");
}

/**
 * ACM-056: `saveBuild`/`updateBuild` (`src/actions/builds.ts`) throw plain
 * `Error`s (or subclasses, but Server Action error serialization strips the
 * subclass and leaves only `.message`) whose text is written for developers,
 * not end users — and some paths (a `parseBuildContent`/Zod failure, a raw DB
 * error) could in principle carry schema/column detail that must never reach
 * the UI. Rather than trying to sanitize an arbitrary string (a denylist,
 * which is exactly the kind of thing that misses the one case that matters),
 * this is an allowlist: only messages we recognize as originating from a
 * known, safe-to-explain failure get translated to PT-BR copy. Anything
 * else — including a message we don't recognize at all — falls back to the
 * generic copy below, same as before this fix.
 */
const KNOWN_SAVE_ERROR_MESSAGES: ReadonlyArray<{ test: RegExp; message: string }> = [
  { test: /^Unauthorized$/, message: "Sua sessão expirou. Entre novamente." },
  { test: /^Too many requests/i, message: "Muitas tentativas. Aguarde um instante." },
  { test: /^Build not found$/, message: "Não encontramos essa build. Ela pode ter sido removida." },
  {
    test: /^The referenced background image does not belong to you$/,
    message: "A imagem de fundo selecionada não é válida. Escolha outra e tente novamente.",
  },
  {
    test: /^Build content exceeds the \d+-byte limit$/,
    message: "O conteúdo da build é grande demais para salvar.",
  },
  { test: /^theme_json exceeds the \d+-byte limit$/, message: "O tema é grande demais para salvar." },
  {
    test: /^Source build content is invalid or from an unsupported legacy format$/,
    message: "Não foi possível salvar: o conteúdo de origem é inválido.",
  },
];

const GENERIC_SAVE_ERROR_MESSAGE = "Não deu para salvar.";

function resolveSaveErrorMessage(rawMessage: string | undefined): string {
  if (rawMessage === undefined) return GENERIC_SAVE_ERROR_MESSAGE;
  const known = KNOWN_SAVE_ERROR_MESSAGES.find(({ test }) => test.test(rawMessage));
  return known ? known.message : GENERIC_SAVE_ERROR_MESSAGE;
}

type SaveStatus =
  | { kind: "idle"; dirty: boolean }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

type ExportStatus = { kind: "idle" } | { kind: "busy" } | { kind: "error"; message: string };

async function isAuthenticated(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session");
    if (!res.ok) return false;
    const data: unknown = await res.json();
    return Boolean(data && typeof data === "object" && "user" in data && (data as { user?: unknown }).user);
  } catch {
    return false;
  }
}

/**
 * Sticky/fixed action bar for the build editor (AC#2). Always a sibling of
 * the preview wrapper — never a positioned ancestor of `#capture-root`
 * (doc-004 §6): a `sticky`/`fixed` wrapper between `<main>` and the capture
 * node would change the capture box, and html-to-image's clone could leak a
 * fixed-positioned node into the exported PNG as a visible band.
 */
export function EditorActionBar({
  buildName,
  filledCount,
  totalSlots,
  hasReadyItem,
  captureNodeRef,
  onSave,
  themePanelOpen,
  onToggleThemePanel,
}: EditorActionBarProps): React.JSX.Element {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: "idle", dirty: false });
  const [exportStatus, setExportStatus] = useState<ExportStatus>({ kind: "idle" });
  const [gateOpen, setGateOpen] = useState(false);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    },
    []
  );

  /**
   * ACM-092 (revised spec): the "salvar/exportar funciona com qualquer
   * quantidade de slots, inclusive zero" reading was revoked. A build must
   * have at least one item equipped with its selectable spells filled before
   * either action is available — see `hasReadyItem` doc comment above for
   * exactly what that means per-item. `filledCount` still feeds the
   * "N/total slots" status readout below, it does not gate the buttons.
   */
  const canSave = buildName.trim() !== "" && hasReadyItem;

  const scheduleSavedReset = useCallback(() => {
    if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setSaveStatus({ kind: "idle", dirty: false }), 2500);
  }, []);

  const handleSaveClick = useCallback(async () => {
    if (!canSave || saveStatus.kind === "saving") return;
    const authed = await isAuthenticated();
    if (!authed) {
      setGateOpen(true);
      return;
    }
    setSaveStatus({ kind: "saving" });
    try {
      await onSave();
      setSaveStatus({ kind: "saved" });
      toast.success("Build salva.");
      scheduleSavedReset();
    } catch (error) {
      setSaveStatus({
        kind: "error",
        message: resolveSaveErrorMessage(error instanceof Error ? error.message : undefined),
      });
    }
  }, [canSave, onSave, saveStatus.kind, scheduleSavedReset]);

  const handleExportClick = useCallback(async () => {
    if (!hasReadyItem) return;
    const node = resolveCaptureNode(captureNodeRef.current);
    if (node === null) {
      setExportStatus({ kind: "error", message: "Card não está pronto para exportar." });
      return;
    }
    setExportStatus({ kind: "busy" });
    try {
      const dataUrl = await exportNodeToPng(node);
      downloadDataUrl(dataUrl, buildExportFilename(buildName));
      setExportStatus({ kind: "idle" });
    } catch (error) {
      setExportStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Falha ao exportar PNG.",
      });
    }
  }, [buildName, captureNodeRef, hasReadyItem]);

  const saving = saveStatus.kind === "saving";
  const exporting = exportStatus.kind === "busy";
  const saveDisabled = !canSave || saving;
  const exportDisabled = !hasReadyItem || saving || exporting;

  let statusMessage: string;
  let statusIsError = false;
  if (saveStatus.kind === "error") {
    statusMessage = saveStatus.message;
    statusIsError = true;
  } else if (exportStatus.kind === "error") {
    statusMessage = exportStatus.message;
    statusIsError = true;
  } else if (saveStatus.kind === "saving") {
    statusMessage = "Salvando…";
  } else if (saveStatus.kind === "saved") {
    statusMessage = "Build salva.";
  } else if (buildName.trim() === "") {
    statusMessage = "Dê um nome pra build";
  } else if (!hasReadyItem) {
    statusMessage = "Equipe pelo menos um item com as habilidades preenchidas";
  } else {
    statusMessage = saveStatus.dirty ? "não salvo" : "";
  }

  return (
    <div
      data-testid="editor-action-bar"
      className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] md:sticky md:top-[var(--header-h)] md:bottom-auto md:border-b md:border-t-0 md:pb-3"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        <span data-testid="slot-count" className="hidden shrink-0 text-foreground/70 md:inline">
          {filledCount}/{totalSlots} slots
        </span>
        <span
          role="status"
          aria-live="polite"
          id="editor-action-bar-status"
          className={statusIsError ? "min-w-0 text-[var(--color-icon-error-fg)]" : "min-w-0 text-foreground/70"}
        >
          {statusMessage}
        </span>
        {saveStatus.kind === "error" && (
          <button
            type="button"
            onClick={() => void handleSaveClick()}
            className="shrink-0 text-sm font-medium text-foreground underline underline-offset-2 transition-colors hover:text-foreground/80 focus-visible:transition-none"
          >
            Tentar de novo
          </button>
        )}
      </div>

      <div className="relative flex shrink-0 flex-row-reverse items-center gap-3">
        <button
          ref={saveButtonRef}
          type="button"
          onClick={() => void handleSaveClick()}
          aria-disabled={saveDisabled}
          aria-describedby="editor-action-bar-status"
          disabled={saving}
          className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => void handleExportClick()}
          disabled={exportDisabled}
          className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[var(--color-icon-slot)] focus-visible:transition-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? "Exportando…" : "Exportar PNG"}
        </button>
        {onToggleThemePanel && (
          <button
            type="button"
            onClick={onToggleThemePanel}
            aria-expanded={themePanelOpen}
            aria-controls="theme-panel"
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-[var(--color-icon-slot)] focus-visible:transition-none"
          >
            Aparência
          </button>
        )}

        {gateOpen && (
          <div
            role="dialog"
            aria-label="Entrar para salvar"
            className="absolute bottom-full right-0 z-40 mb-2 w-72 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm shadow-[0_8px_24px_-12px_#000000]"
          >
            <p className="text-foreground">Entre para salvar esta build. Ela não será perdida.</p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setGateOpen(false);
                  saveButtonRef.current?.focus();
                }}
                className="rounded-md px-3 py-1.5 text-foreground/70 transition-colors hover:text-foreground focus-visible:transition-none"
              >
                Agora não
              </button>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /api/auth/signin is a NextAuth route handler, not an app-router page. */}
              <a
                href="/api/auth/signin"
                className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-medium text-[var(--color-accent-foreground)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:transition-none"
              >
                Entrar
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
