"use client";

import { useEffect, useRef } from "react";

export type DeleteCompDialogProps = {
  compName: string;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/**
 * Confirms an irreversible comp delete (ACM-113 AC#4/AC#5). Mirrors
 * `DeleteBuildDialog`'s hand-rolled focus trap / Escape-to-close / focus
 * restoration, since no dialog primitive was in use on `/comps` before this
 * task either.
 */
export function DeleteCompDialog({ compName, pending, onConfirm, onClose }: DeleteCompDialogProps): React.JSX.Element {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelButtonRef.current?.focus();

    function getFocusableElements(): HTMLElement[] {
      const container = dialogRef.current;
      if (!container) return [];
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialogRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-comp-dialog-title"
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      >
        <h2 id="delete-comp-dialog-title" className="text-base font-semibold text-foreground">
          Excluir &quot;{compName}&quot;?
        </h2>
        <p className="text-sm text-foreground/60">Essa ação não pode ser desfeita e remove todas as builds vinculadas a esta comp.</p>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={pending}
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus-visible:transition-none"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="rounded-md bg-red-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:transition-none"
          >
            {pending ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}
