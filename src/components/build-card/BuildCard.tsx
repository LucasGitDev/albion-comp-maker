"use client";

import { useEffect, useRef, useState } from "react";
import type { BuildState } from "@/types/build";
import { BuildCardCompressed } from "./BuildCardCompressed";
import { BuildCardGrid } from "./BuildCardGrid";
import { BuildCardList } from "./BuildCardList";
import { BuildCardVertical } from "./BuildCardVertical";
import { resolveFontFamily, resolvePresetTokens } from "./theme-presets";
import { DEFAULT_BUILD_CARD_THEME, EMPTY_LOOKUPS, type BuildCardLookups, type BuildCardTheme } from "./types";

export type BuildCardLayout = "vertical" | "grid" | "compressed" | "list";

export type BuildCardProps = {
  /** The build to render. BuildCard reads only this prop — no store, no context. */
  state: BuildState;
  /** `vertical` = full standalone card (960px). `grid` = narrow comp column (320px). */
  layout?: BuildCardLayout;
  theme?: Partial<BuildCardTheme>;
  /** Display-only lookups (item/spell names, which spell groups an item exposes). */
  itemNames?: BuildCardLookups["itemNames"];
  spellNames?: BuildCardLookups["spellNames"];
  spellGroupsByItem?: BuildCardLookups["spellGroupsByItem"];
  /**
   * DOM id of the capture root. Defaults to `"capture-root"` — the single
   * export/editor route (ACM-018/019, `EditorActionBar`/`ExportBar`,
   * decision-010) only ever mounts one `BuildCard` at a time, so the
   * default keeps that contract unchanged. Any caller that renders more
   * than one `BuildCard` on the same page (e.g. the public comp page,
   * ACM-021) MUST pass a unique id per instance — otherwise the page emits
   * duplicate `id="capture-root"` nodes, which is invalid HTML and makes
   * `document.getElementById`/`querySelector("#capture-root")` silently
   * resolve to the first one only.
   */
  captureId?: string;
};

/** `wide`/`square` wrapper dimensions (doc-007 §8), logical px before export `scale: 2`. */
const ASPECT_WRAPPER: Readonly<Record<BuildCardTheme["aspectRatio"], { aspectRatio?: string; minHeight?: number }>> = {
  auto: {},
  square: { aspectRatio: "1 / 1" },
  wide: { aspectRatio: "16 / 9" },
};

/** Numeric ratio for each named aspect option, used only for overflow detection below. */
const ASPECT_RATIO_NUMBER: Readonly<Record<BuildCardTheme["aspectRatio"], number | null>> = {
  auto: null,
  square: 1,
  wide: 16 / 9,
};

/** How far below the declared ratio counts as "actually cropped" vs. sub-pixel rounding noise. */
const ASPECT_OVERFLOW_EPSILON = 0.02;

/**
 * doc-007 §8's "protection rule": the card is never cropped. `aspect-ratio`
 * on the wrapper only *proposes* a height for a given width — with
 * `overflow: visible` (see render below) a browser lets the box grow past
 * that proposal when content needs more room, it never clips it. This hook
 * only detects that it happened, so the UI can also *say* so (PR #50 CRITICAL
 * fix): it compares the wrapper's actually-rendered aspect ratio against the
 * one it asked for; a real ratio narrower than requested means content pushed
 * the box taller than the square/wide box would otherwise be.
 */
function useAspectOverflowWarning(
  ref: React.RefObject<HTMLDivElement | null>,
  aspectRatio: BuildCardTheme["aspectRatio"]
): boolean {
  const [overflow, setOverflow] = useState(false);
  const expected = ASPECT_RATIO_NUMBER[aspectRatio];

  useEffect(() => {
    const reset = (): void => setOverflow(false);
    if (expected === null) {
      reset();
      return;
    }
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const check = (): void => {
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      setOverflow(rect.width / rect.height < expected - ASPECT_OVERFLOW_EPSILON);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, expected]);

  return overflow;
}

/**
 * Single source of truth for the build preview AND the exported PNG (RF-4,
 * RF-5 / ACM-013 AC#4). This component:
 *  - never imports Zustand or any store — it is pure w.r.t. props, so it can
 *    be rendered outside the browser (server, Satori) without a second
 *    layout implementation (see ACM-013 implementation notes / ACM-011 §7);
 *  - never renders an interactive element (no button, no input, no
 *    `:hover`-only styling) — hover/edit chrome belongs to a sibling overlay
 *    owned by the editor, never inside this capture root;
 *  - never uses a Tailwind palette color utility (those compile to
 *    `oklch()`, which html-to-image/ACM-015 (decision-007) cannot parse) —
 *    every color here is a hex literal from `./tokens`/`./theme-presets`.
 *
 * `#capture-root` is the DOM node ACM-015 passes to `html-to-image`.
 *
 * Background image (ACM-014 AC#1-3): rendered as a real `<img>`, never a CSS
 * `background-image`. `src/lib/export-png.ts`'s `waitForImage` guard walks
 * every `<img>` under the capture root before rasterizing; a CSS
 * `background-image` is invisible to that guard and `html-to-image` would
 * fetch it on its own timeline, so the exported PNG could silently come out
 * without the background. An `<img>` gets that guarantee for free.
 */
export function BuildCard({
  state,
  layout = "vertical",
  theme,
  itemNames,
  spellNames,
  spellGroupsByItem,
  captureId = "capture-root",
}: BuildCardProps): React.JSX.Element {
  const resolvedTheme: BuildCardTheme = { ...DEFAULT_BUILD_CARD_THEME, ...theme };
  const tokens = resolvePresetTokens(resolvedTheme.preset);
  const fontFamily = resolveFontFamily(resolvedTheme.fontFamily);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const overflowWarning = useAspectOverflowWarning(wrapperRef, resolvedTheme.aspectRatio);
  const lookups: BuildCardLookups = {
    itemNames: itemNames ?? EMPTY_LOOKUPS.itemNames,
    spellNames: spellNames ?? EMPTY_LOOKUPS.spellNames,
    spellGroupsByItem: spellGroupsByItem ?? EMPTY_LOOKUPS.spellGroupsByItem,
  };

  const background = resolvedTheme.background;
  // Blur bleeds past the image's own edges; scaling the image up by a hair
  // more than the user's requested scale compensates so no transparent halo
  // appears at the wrapper edges once blurred (doc-007 §6.3).
  const blurCompensation = background ? 1 + background.blur / 100 : 1;

  return (
    <div data-build-card-wrapper style={{ display: "inline-flex", flexDirection: "column", gap: 8 }}>
      <div
        id={captureId}
        data-build-card
        data-layout={layout}
        ref={wrapperRef}
        style={{
          display: "inline-flex",
          position: "relative",
          // doc-007 §8's protection rule: the card is NEVER cropped. Unlike
          // the pre-fix version, this wrapper does not clip — `aspect-ratio`
          // below only proposes a height for `square`/`wide`; if the card's
          // actual content needs more room than that, the box (and therefore
          // the PNG export, since this is the capture root) grows to fit it
          // instead of silently cutting content off. `overflowWarning` below
          // surfaces that this happened instead of hiding it.
          overflow: "visible",
          fontFamily,
          ...ASPECT_WRAPPER[resolvedTheme.aspectRatio],
        }}
      >
      {background && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- must be a real <img> for the export waitForImage guard, see module doc. */}
          <img
            src={`/api/background/${background.imageId}`}
            alt=""
            aria-hidden="true"
            data-build-card-background
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: `blur(${background.blur}px)`,
              transform: `scale(${background.scale * blurCompensation})`,
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#000000",
              opacity: background.darken,
            }}
          />
        </>
      )}
      <div style={{ position: "relative" }}>
        {layout === "grid" ? (
          <BuildCardGrid state={state} theme={resolvedTheme} lookups={lookups} tokens={tokens} />
        ) : layout === "compressed" ? (
          <BuildCardCompressed state={state} theme={resolvedTheme} lookups={lookups} tokens={tokens} />
        ) : layout === "list" ? (
          <BuildCardList state={state} theme={resolvedTheme} lookups={lookups} tokens={tokens} />
        ) : (
          <BuildCardVertical state={state} theme={resolvedTheme} lookups={lookups} tokens={tokens} />
        )}
      </div>
      </div>
      {overflowWarning && (
        <p role="status" aria-live="polite" data-build-card-overflow-warning className="text-[12px]" style={{ color: "#f87171" }}>
          A build é alta demais para esse formato — o card foi ajustado.
        </p>
      )}
    </div>
  );
}
