"use client";

import { useEffect, useRef } from "react";
import type { AOItem, Slot } from "@/data/ao-data.d";
import { ItemPicker } from "@/components/item-picker/ItemPicker";

export type SlotPickerPopoverProps = {
  slot: Slot;
  items: AOItem[];
  value: string | null;
  label: string;
  onSelect: (item: AOItem) => void;
  onClose: () => void;
};

/**
 * Modal shell around the uncontrolled ACM-008 `ItemPicker` (ACM-034). The
 * picker itself renders inline with no open/close prop and no
 * modal/portal — this component owns the overlay, backdrop-click-to-close
 * and initial focus.
 *
 * Escape-to-close is delegated to `ItemPicker`'s own key handling
 * (doc-002 section 7: Escape clears the query first, then closes on the
 * next press). Autofocusing the search input on mount is what makes that
 * handling reachable without extra wiring here.
 */
export function SlotPickerPopover({
  slot,
  items,
  value,
  label,
  onSelect,
  onClose,
}: SlotPickerPopoverProps): React.JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const input = panelRef.current?.querySelector<HTMLInputElement>('input[role="combobox"]');
    input?.focus();
  }, []);

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
        className="w-[320px]"
        onClick={(event) => event.stopPropagation()}
      >
        <ItemPicker
          slot={slot}
          items={items}
          value={value}
          label={label}
          onSelect={onSelect}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
