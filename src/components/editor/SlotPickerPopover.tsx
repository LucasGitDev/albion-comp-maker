"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import type { AOItem, Slot } from "@/data/ao-data.d";
import { ItemPicker } from "@/components/item-picker/ItemPicker";

export type SlotPickerPopoverProps = {
  slot: Slot;
  items: AOItem[];
  /** True while the initial catalogue fetch is in flight (ACM-034/043). */
  catalogueLoading?: boolean;
  /** True when the catalogue failed to load — distinct from "no matches". */
  catalogueFailed?: boolean;
  /**
   * Only meaningful when `catalogueFailed` is true. `"missing-artifact"` is
   * the only case where the `npm run sync:ao` hint is correct (it means the
   * server itself reported the pipeline artifact as absent); any other
   * value (or omission) renders ordinary "something went wrong" copy so a
   * non-technical guild leader is never told to run a terminal command for
   * a network blip or deploy hiccup (ACM-034 follow-up review).
   */
  catalogueFailedReason?: "missing-artifact" | "generic" | null;
  /**
   * Re-runs the catalogue fetch (ACM-034 follow-up review). Optional so
   * existing call sites/tests that don't exercise the failed state keep
   * working unchanged; the retry affordance is only rendered when provided.
   */
  onRetryCatalogue?: () => void;
  value: string | null;
  label: string;
  /**
   * Element to return focus to on close. Must be captured by the caller
   * *before* it re-renders any ancestor `inert`/hidden (see page.tsx) —
   * reading `document.activeElement` from an effect here is too late once
   * the background has already been marked inert, since that force-blurs
   * the focused element as part of the same commit. Falls back to
   * `document.activeElement` at mount for callers that don't pass one.
   */
  restoreFocusTo?: HTMLElement | null;
  onSelect: (item: AOItem) => void;
  onClose: () => void;
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal shell around the uncontrolled ACM-008 `ItemPicker` (ACM-034). The
 * picker itself renders inline with no open/close prop and no
 * modal/portal — this component owns the overlay, backdrop-click-to-close,
 * initial focus, a real focus trap, background scroll lock and focus
 * restoration to the trigger on close (ACM-034 follow-up review).
 *
 * Escape-to-close is delegated to `ItemPicker`'s own key handling
 * (doc-002 section 7: Escape clears the query first, then closes on the
 * next press). Autofocusing the search input on mount is what makes that
 * handling reachable without extra wiring here.
 */
export function SlotPickerPopover({
  slot,
  items,
  catalogueLoading = false,
  catalogueFailed = false,
  catalogueFailedReason = null,
  onRetryCatalogue,
  value,
  label,
  restoreFocusTo = null,
  onSelect,
  onClose,
}: SlotPickerPopoverProps): React.JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(restoreFocusTo ?? document.activeElement);

  const showPicker = !catalogueLoading && !catalogueFailed;

  // Runs once: lock background scroll for the lifetime of the dialog. The
  // trigger to restore focus to is captured above (lazily, at first render)
  // rather than here, since an ancestor may already have been marked inert
  // by the time this effect runs — see `restoreFocusTo`'s doc comment.
  useEffect(() => {
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement) {
        trigger.focus();
      }
    };
  }, []);

  // Re-runs whenever the picker becomes available (loading -> loaded/failed)
  // so focus always lands on something inside the dialog.
  useEffect(() => {
    const input = panelRef.current?.querySelector<HTMLInputElement>('input[role="combobox"]');
    if (input) {
      input.focus();
    } else {
      panelRef.current?.focus();
    }
  }, [showPicker]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape" && !showPicker) {
      event.preventDefault();
      onClose();
      return;
    }
  }

  /**
   * Focus trap, run on the CAPTURE phase (ACM-034 focus-trap regression
   * fix). Loops focus back to the first/last focusable element inside the
   * panel whenever Tab/Shift+Tab would otherwise move it outside the
   * dialog — in this single-input picker that's every Tab press, since the
   * search input is both the first and last focusable element.
   *
   * ItemPicker itself (ACM-046) calls `preventDefault()` when Tab commits
   * the highlighted result, so a committing Tab no longer reaches the
   * browser's native focus-move behavior. This capture-phase handler
   * additionally `preventDefault()`s the boundary case so a non-committing
   * Tab (no highlighted result) can't escape either. It intentionally does
   * NOT `stopPropagation()`: that would also block ItemPicker's own Tab
   * handling, which is unnecessary now that the fix lives at the source.
   */
  function handleKeyDownCapture(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => !el.hasAttribute("data-focus-trap-ignore")
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement;

    if (event.shiftKey) {
      if (current === first || !panel.contains(current)) {
        event.preventDefault();
        last.focus();
      }
    } else if (current === last || !panel.contains(current)) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24"
      onClick={onClose}
      data-testid="item-picker-backdrop"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="flex w-[320px] flex-col gap-2 outline-none"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
        onKeyDownCapture={handleKeyDownCapture}
      >
        {catalogueFailed ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-2 rounded-md border border-[#5a2a2a] bg-[#1d1414] p-3 text-[13px] text-[#f2b8b8]"
          >
            <span>
              {catalogueFailedReason === "missing-artifact" ? (
                <>
                  Catálogo de itens indisponível. Rode <code>npm run sync:ao</code> para gerá-lo e
                  tente novamente.
                </>
              ) : (
                "Não foi possível carregar os itens. Verifique sua conexão e tente novamente."
              )}
            </span>
            {onRetryCatalogue && (
              <button
                type="button"
                onClick={onRetryCatalogue}
                className="rounded-md border border-[#5a2a2a] px-2 py-1 text-[12px] font-medium text-[#f2b8b8] transition-colors duration-150 ease-out hover:bg-[#2a1818]"
              >
                Tentar novamente
              </button>
            )}
          </div>
        ) : catalogueLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-md border border-[#2a2e37] bg-[#14171d] p-3 text-[13px] text-icon-muted"
          >
            <span
              aria-hidden="true"
              className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Carregando catálogo de itens…
          </div>
        ) : (
          <ItemPicker
            slot={slot}
            items={items}
            value={value}
            label={label}
            onSelect={onSelect}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
