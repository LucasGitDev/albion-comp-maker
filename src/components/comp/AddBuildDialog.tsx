"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import type { MyBuildOption } from "./CompBuildsManager";

export type AddBuildDialogProps = {
  builds: MyBuildOption[];
  disabled: boolean;
  onSelect: (build: MyBuildOption) => void;
  onClose: () => void;
};

/**
 * Picker for attaching one of the caller's own builds to a comp (ACM-098).
 * There is no existing build picker to reuse — `ItemPicker` is a picker of
 * in-game items, not of the user's saved builds — so this is a small,
 * dedicated modal rather than a generalization of `ItemPicker`.
 *
 * `role="dialog"` + `Escape`-to-close + focus-on-open, with a hand-rolled
 * focus trap (Tab/Shift+Tab cycle within the modal) and focus restoration to
 * whatever triggered the dialog on close: no dialog primitive exists yet in
 * this codebase's dependencies (only `ItemPicker`'s own popover, which is
 * not reusable here), so `role`/`aria-modal` alone are not enough — they are
 * purely semantic and do not stop focus from leaving the modal via Tab.
 */
export function AddBuildDialog({ builds, disabled, onSelect, onClose }: AddBuildDialogProps): React.JSX.Element {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function getFocusableElements(): HTMLElement[] {
      const container = dialogRef.current;
      if (!container) return [];
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
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
        aria-labelledby="add-build-dialog-title"
        className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
      >
        <div className="flex items-center justify-between">
          <h2 id="add-build-dialog-title" className="text-base font-semibold text-foreground">
            Adicionar build
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md px-2 py-1 text-sm text-foreground/60 transition-colors hover:text-foreground focus-visible:transition-none"
          >
            ✕
          </button>
        </div>

        {builds.length === 0 ? (
          <p className="text-sm text-foreground/60">Você ainda não tem nenhuma build.</p>
        ) : (
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {builds.map((build) => (
              <li key={build.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(build)}
                  className="flex w-full flex-col rounded-md border border-[var(--color-border)] px-3 py-2 text-left transition-colors hover:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:transition-none"
                >
                  <span className="text-sm font-medium text-foreground">{build.name}</span>
                  <span className="text-xs text-foreground/60">{build.role || "Sem papel"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <Link
          href="/build/new"
          className="text-center text-sm font-medium text-[var(--color-accent)] underline-offset-2 hover:underline"
        >
          Criar nova build
        </Link>
      </div>
    </div>
  );
}
