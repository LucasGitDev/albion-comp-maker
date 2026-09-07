import type { BuildState } from "@/types/build";
import { BuildCardGrid } from "./BuildCardGrid";
import { BuildCardVertical } from "./BuildCardVertical";
import { DEFAULT_BUILD_CARD_THEME, EMPTY_LOOKUPS, type BuildCardLookups, type BuildCardTheme } from "./types";

export type BuildCardLayout = "vertical" | "grid";

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
 *    every color here is a hex literal from `./tokens`.
 *
 * `#capture-root` is the DOM node ACM-015 passes to `html-to-image`.
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
  const lookups: BuildCardLookups = {
    itemNames: itemNames ?? EMPTY_LOOKUPS.itemNames,
    spellNames: spellNames ?? EMPTY_LOOKUPS.spellNames,
    spellGroupsByItem: spellGroupsByItem ?? EMPTY_LOOKUPS.spellGroupsByItem,
  };

  return (
    <div id={captureId} data-build-card data-layout={layout} style={{ display: "inline-flex" }}>
      {layout === "grid" ? (
        <BuildCardGrid state={state} theme={resolvedTheme} lookups={lookups} />
      ) : (
        <BuildCardVertical state={state} theme={resolvedTheme} lookups={lookups} />
      )}
    </div>
  );
}
