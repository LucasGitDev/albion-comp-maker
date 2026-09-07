"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import type { AOItem, Slot } from "@/data/ao-data.d";
import { buildItemIndex, searchItems, type ItemIndex } from "@/lib/item-index";
import { ItemSearchInput } from "./item-search-input";
import { ItemResultList } from "./item-result-list";

export type ItemPickerProps = {
  /** Slot this picker fills. Hard-filters the candidate set. Never shown as a control. */
  slot: Slot;
  /** Full item catalogue to search over. The caller owns fetching/store access. */
  items: AOItem[];
  /** Fired when the user commits a selection (Enter/Tab/click). */
  onSelect: (item: AOItem) => void;
  /** Fired when the picker should close without a selection. */
  onClose: () => void;
  /**
   * Uniquename of the item currently equipped in this slot, or null/undefined
   * when empty. The matching row renders aria-selected="true" (doc-002
   * section 5.7/7). Optional and defaults to null so existing ACM-008 call
   * sites keep working unchanged.
   */
  value?: string | null;
  /** Active UI locale used for display and primary ranking. Defaults to "en-US". */
  locale?: string;
  label?: string;
  className?: string;
};

const DEBOUNCE_MS = 120;
const PAGE_SIZE = 9;

/** Module-level memoized index, keyed by array identity — see doc-002 section 2.1. */
const indexCache = new WeakMap<AOItem[], ItemIndex>();

function getOrBuildIndex(items: AOItem[]): ItemIndex {
  const cached = indexCache.get(items);
  if (cached) return cached;
  const built = buildItemIndex(items);
  indexCache.set(items, built);
  return built;
}

function optionId(item: AOItem): string {
  return `ip-opt-${item.uniquename}`;
}

/**
 * Self-contained slot-filling autocomplete (ACM-008 / doc-002). Renders the
 * search input and result list only — the trigger, locked/2H-offhand state
 * and undo toast are owned by the caller, which knows the comp shape.
 */
export function ItemPicker({
  slot,
  items,
  onSelect,
  onClose,
  value = null,
  locale = "en-US",
  label,
  className,
}: ItemPickerProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const index = useMemo(() => getOrBuildIndex(items), [items]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setActiveIndex(0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(
    () => searchItems(index, debouncedQuery, { slot, locale }),
    [index, debouncedQuery, slot, locale]
  );

  const clampedActiveIndex = results.length === 0 ? -1 : Math.min(activeIndex, results.length - 1);
  const activeItem = clampedActiveIndex >= 0 ? results[clampedActiveIndex] : undefined;
  const inputId = `ip-input-${slot}`;
  const listboxId = `ip-listbox-${slot}`;
  const listboxLabel = label ?? `Items for ${slot}`;

  function commitSelection(item: AOItem | undefined): void {
    if (!item) return;
    onSelect(item);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
        break;
      case "PageDown":
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + PAGE_SIZE, Math.max(results.length - 1, 0)));
        break;
      case "PageUp":
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - PAGE_SIZE, 0));
        break;
      case "Home":
        if (query.length === 0) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case "End":
        if (query.length === 0) {
          event.preventDefault();
          setActiveIndex(Math.max(results.length - 1, 0));
        }
        break;
      case "Enter":
        event.preventDefault();
        commitSelection(activeItem);
        break;
      case "Tab":
        if (activeItem) {
          event.preventDefault();
          commitSelection(activeItem);
        }
        break;
      case "Escape":
        event.preventDefault();
        if (query.length > 0) {
          setQuery("");
        } else {
          onClose();
        }
        break;
      case "Backspace":
        if (query.length === 0) {
          onClose();
        }
        break;
      default:
        break;
    }
  }

  return (
    <div className={className ?? "w-full rounded-md border border-[#2a2e37] bg-[#14171d] p-2"}>
      <label htmlFor={inputId} className="sr-only">
        {listboxLabel}
      </label>
      <ItemSearchInput
        id={inputId}
        value={query}
        placeholder={`Search ${slot}…`}
        activeDescendantId={activeItem ? optionId(activeItem) : undefined}
        listboxId={listboxId}
        onChange={setQuery}
        onKeyDown={handleKeyDown}
      />
      <div role="status" aria-live="polite" className="sr-only">
        {results.length === 0
          ? "No items found"
          : `${results.length} result${results.length === 1 ? "" : "s"}`}
      </div>
      <ItemResultList
        id={listboxId}
        label={listboxLabel}
        items={results}
        activeIndex={clampedActiveIndex}
        locale={locale}
        query={debouncedQuery}
        value={value}
        optionId={optionId}
        onHover={setActiveIndex}
        onSelect={commitSelection}
      />
    </div>
  );
}
