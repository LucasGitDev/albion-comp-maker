"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import type { AOItem } from "@/data/ao-data.d";
import { ItemIcon } from "@/components/icons/ItemIcon";
import { pickLocalizedName } from "@/lib/localized-name";
import {
  extractTextTokens,
  findMatchRanges,
  matchesOnlyOtherLocale,
  otherLocaleOf,
  segmentName,
  type NameSegment,
} from "./highlight";

export type ItemResultListProps = {
  id: string;
  label: string;
  items: AOItem[];
  activeIndex: number;
  locale: string;
  /** Raw (debounced) query, used to derive <mark> highlight ranges. */
  query: string;
  /** Uniquename of the item currently equipped in this slot, or null/undefined when empty. */
  value?: string | null;
  optionId: (item: AOItem) => string;
  onHover: (index: number) => void;
  onSelect: (item: AOItem) => void;
};

const ROW_HEIGHT = 44;
const OVERSCAN = 8;
const VIRTUALIZE_THRESHOLD = 40;
const DEFAULT_VIEWPORT_HEIGHT = 420;

function tierOf(uniquename: string): number {
  const match = /^T([1-8])_/.exec(uniquename);
  return match ? Number(match[1]) : 0;
}

function renderSegments(segments: NameSegment[], keyPrefix: string): JSX.Element[] {
  return segments.map((segment, i) =>
    segment.marked ? (
      <mark key={`${keyPrefix}-${i}`} className="rounded-sm bg-transparent text-[#f5d98a]">
        {segment.text}
      </mark>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{segment.text}</span>
    )
  );
}

/**
 * 44px single-line rows per doc-002 section 3.2. No grouping, no fuzzy
 * match. Windowed (hand-rolled, no new dependency) when results exceed 40
 * rows per doc-002 section 3.3.
 */
export function ItemResultList({
  id,
  label,
  items,
  activeIndex,
  locale,
  query,
  value,
  optionId,
  onHover,
  onSelect,
}: ItemResultListProps): React.JSX.Element {
  const containerRef = useRef<HTMLUListElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_VIEWPORT_HEIGHT);

  const textTokens = useMemo(() => extractTextTokens(query), [query]);
  const otherLocale = otherLocaleOf(locale);

  const shouldVirtualize = items.length > VIRTUALIZE_THRESHOLD;

  useEffect(() => {
    if (!shouldVirtualize) return;
    const el = containerRef.current;
    if (el && el.clientHeight > 0) setViewportHeight(el.clientHeight);
  }, [shouldVirtualize]);

  // Keep the keyboard-highlighted row scrolled into the virtualized viewport
  // (block: "nearest" equivalent) even when it isn't currently rendered.
  useEffect(() => {
    if (!shouldVirtualize || activeIndex < 0) return;
    const el = containerRef.current;
    if (!el) return;
    const rowTop = activeIndex * ROW_HEIGHT;
    const rowBottom = rowTop + ROW_HEIGHT;
    if (rowTop < el.scrollTop) {
      el.scrollTop = rowTop;
      setScrollTop(rowTop);
    } else if (rowBottom > el.scrollTop + el.clientHeight) {
      const next = rowBottom - el.clientHeight;
      el.scrollTop = next;
      setScrollTop(next);
    }
  }, [activeIndex, shouldVirtualize]);

  let startIndex = 0;
  let endIndex = items.length;
  let topSpacer = 0;
  let bottomSpacer = 0;

  if (shouldVirtualize) {
    const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT);
    startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    endIndex = Math.min(items.length, startIndex + visibleCount + OVERSCAN * 2);
    topSpacer = startIndex * ROW_HEIGHT;
    bottomSpacer = (items.length - endIndex) * ROW_HEIGHT;
  }

  const visibleItems = shouldVirtualize ? items.slice(startIndex, endIndex) : items;

  return (
    <ul
      id={id}
      ref={containerRef}
      role="listbox"
      aria-label={label}
      className="max-h-[420px] overflow-y-auto"
      onScroll={shouldVirtualize ? (event) => setScrollTop(event.currentTarget.scrollTop) : undefined}
    >
      {shouldVirtualize && topSpacer > 0 && (
        <li aria-hidden="true" style={{ height: topSpacer, listStyle: "none" }} />
      )}
      {visibleItems.map((item, localIndex) => {
        const index = startIndex + localIndex;
        const activeName = pickLocalizedName(item.localizedNames, locale) ?? item.uniquename;
        const otherName = otherLocale ? pickLocalizedName(item.localizedNames, otherLocale) : undefined;
        const tier = tierOf(item.uniquename);
        const isActive = index === activeIndex;
        const isEquipped = value != null && item.uniquename === value;
        const showCrossLocale = matchesOnlyOtherLocale(activeName, otherName, textTokens);
        const primarySegments = segmentName(activeName, findMatchRanges(activeName, textTokens));
        const secondarySegments =
          showCrossLocale && otherName
            ? segmentName(otherName, findMatchRanges(otherName, textTokens))
            : null;

        return (
          <li
            key={item.uniquename}
            id={optionId(item)}
            role="option"
            aria-selected={isEquipped}
            aria-setsize={items.length}
            aria-posinset={index + 1}
            onMouseEnter={() => onHover(index)}
            onClick={() => onSelect(item)}
            className={`relative flex h-11 cursor-pointer items-center gap-2 px-2 text-sm text-white ${
              isActive ? "bg-[#232833]" : "hover:bg-[#1c1f26]"
            } ${isEquipped ? "before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-[#c8a24a]" : ""}`}
          >
            <ItemIcon itemId={item.uniquename} alt={activeName} size="sm" decorative />
            <span className="flex-1 truncate">
              {renderSegments(primarySegments, "p")}
              {secondarySegments && (
                <span className="ml-1 text-icon-muted">
                  · {renderSegments(secondarySegments, "s")}
                </span>
              )}
            </span>
            {tier > 0 && (
              <span className="text-xs font-medium tabular-nums text-[#c8a24a]">{`T${tier}`}</span>
            )}
            {item.twohanded && (
              <span className="text-xs font-medium tabular-nums text-icon-muted">2H</span>
            )}
            {isEquipped && (
              <span aria-hidden="true" className="text-xs text-[#c8a24a]">
                ✓
              </span>
            )}
          </li>
        );
      })}
      {shouldVirtualize && bottomSpacer > 0 && (
        <li aria-hidden="true" style={{ height: bottomSpacer, listStyle: "none" }} />
      )}
    </ul>
  );
}
