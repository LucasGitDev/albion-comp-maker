"use client";

import { useEffect, useState } from "react";

export type SlotGroupNavGroup = {
  /** Slug matching the `slot-group-<id>` heading rendered by `SlotGrid`. */
  id: string;
  title: string;
  filled: number;
  total: number;
};

export type SlotGroupNavProps = {
  groups: readonly SlotGroupNavGroup[];
  /** Sum of `groups[].filled`, passed rather than recomputed here (page owns the store). */
  totalFilled: number;
  /** `SLOT_ORDER.length` minus any locked slot (ACM-041 doc-005 §7 — a locked offhand is unreachable, never "pending"). */
  totalSlots: number;
  swapsCount: number;
};

const SWAPS_ANCHOR_ID = "slot-group-swaps";

function readGroupNavHeightPx(): number {
  if (typeof window === "undefined") return 44;
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--group-nav-h").trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 44;
}

/**
 * Sticky anchor strip for the mobile slot grid (ACM-041, doc-005 §5/§9).
 * Deliberately real `<a href="#...">` links, not tabs/buttons: if the
 * scroll-spy `IntersectionObserver` below never runs, every chip is still a
 * working same-document link (doc-005 §2, "âncora é aditiva"). This
 * component owns no store data — it only receives derived counts, so the
 * page stays the sole store subscriber (doc-005 §9).
 */
export function SlotGroupNav({ groups, totalFilled, totalSlots, swapsCount }: SlotGroupNavProps): React.JSX.Element {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const ids = [...groups.map((group) => `slot-group-${group.id}`), SWAPS_ANCHOR_ID];
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const navHeight = readGroupNavHeightPx();
    const lastId = ids[ids.length - 1];

    /**
     * Handles the "short last section" case: a target near the end of the
     * scroll area (e.g. Swaps) can be too short to ever occupy the
     * IntersectionObserver's top ~30% band, so it would never become active
     * on its own. When the user has scrolled to (or past) the bottom of the
     * document, force the last target active regardless of what the
     * observer reports.
     */
    const checkScrollEnd = () => {
      const doc = document.documentElement;
      const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 1;
      if (atBottom && lastId) setActiveId(lastId);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length === 0) {
          checkScrollEnd();
          return;
        }
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b
        );
        setActiveId(topmost.target.id);
        checkScrollEnd();
      },
      { rootMargin: `-${navHeight}px 0px -70% 0px`, threshold: 0 }
    );
    for (const target of targets) observer.observe(target);
    window.addEventListener("scroll", checkScrollEnd, { passive: true });
    checkScrollEnd();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", checkScrollEnd);
    };
  }, [groups]);

  /**
   * Scroll happens natively (real `href="#..."`, global `scroll-behavior:
   * smooth` in globals.css, respecting `prefers-reduced-motion`). This
   * handler only moves focus to the target heading afterward
   * (`preventScroll: true` so it doesn't fight the native scroll) — without
   * it, the heading never receives focus and assistive tech never learns
   * the context changed (doc-005 §8, the inverse of the ACM-012 "focus lost
   * to body" defect).
   */
  const handleAnchorClick = (targetId: string) => () => {
    setActiveId(targetId);
    const target = document.getElementById(targetId);
    target?.focus({ preventScroll: true });
  };

  return (
    <nav
      aria-label="Grupos de slots"
      className="sticky top-0 z-10 flex h-11 min-w-0 items-center gap-2 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-surface)] px-1 md:hidden"
    >
      <span className="shrink-0 whitespace-nowrap px-2 text-[12px] font-medium text-icon-muted">
        {totalFilled}/{totalSlots}
      </span>
      {groups.map((group) => {
        const anchorId = `slot-group-${group.id}`;
        const isActive = activeId === anchorId;
        return (
          <a
            key={group.id}
            href={`#${anchorId}`}
            onClick={handleAnchorClick(anchorId)}
            aria-current={isActive ? "location" : undefined}
            aria-label={`${group.title} ${group.filled} de ${group.total}`}
            className={`flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-md border px-3 py-2 text-[12px] font-medium transition-colors duration-150 ease-out ${
              isActive
                ? "border-[var(--color-accent)] bg-[var(--color-icon-slot)] text-foreground"
                : "border-[var(--color-border)] text-icon-muted"
            }`}
          >
            {group.title} {group.filled}/{group.total}
          </a>
        );
      })}
      <a
        href={`#${SWAPS_ANCHOR_ID}`}
        onClick={handleAnchorClick(SWAPS_ANCHOR_ID)}
        aria-current={activeId === SWAPS_ANCHOR_ID ? "location" : undefined}
        aria-label={`Swaps ${swapsCount}`}
        className={`flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-md border px-3 py-2 text-[12px] font-medium transition-colors duration-150 ease-out ${
          activeId === SWAPS_ANCHOR_ID
            ? "border-[var(--color-accent)] bg-[var(--color-icon-slot)] text-foreground"
            : "border-[var(--color-border)] text-icon-muted"
        }`}
      >
        Swaps · {swapsCount}
      </a>
    </nav>
  );
}
