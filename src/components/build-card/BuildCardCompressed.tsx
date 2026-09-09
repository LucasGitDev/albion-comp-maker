import { ItemIcon } from "@/components/icons/ItemIcon";
import type { BuildState, Swap } from "@/types/build";
import { CompressedTile } from "./CompressedTile";
import { KILLBOARD_MATRIX } from "./layout-matrix";
import type { BuildCardTokenSet } from "./theme-presets";
import { resolveAccent } from "./tokens";
import type { BuildCardLookups, BuildCardTheme } from "./types";

export type BuildCardCompressedProps = {
  state: BuildState;
  theme: BuildCardTheme;
  lookups: BuildCardLookups;
  tokens: BuildCardTokenSet;
};

/** Fixed logical width (doc-006 §2.2): 540px, sized for Discord's inline embed preview. */
const CARD_WIDTH = 540;
const MATRIX_COLUMN_PX = 256;

function swapItemName(swap: Swap, lookups: BuildCardLookups): string {
  for (const item of Object.values(swap.slots)) {
    if (item) return lookups.itemNames[item.itemId] ?? item.itemId;
  }
  return "";
}

/**
 * Killboard-style paperdoll card (doc-006 §2): dense, icon-first, meant to be
 * pasted straight into Discord. Not a parametrization of `BuildCardVertical`
 * (doc-006 §5) — it is a fixed 3x3 positional matrix with its own meta panel,
 * no item names, and a hard height budget (§2.6), all of which the vertical
 * layout's flow-based structure cannot express without branching so heavily
 * it stops being "the same component".
 */
export function BuildCardCompressed({ state, lookups, tokens }: BuildCardCompressedProps): React.JSX.Element {
  const accent = resolveAccent(state.role, state.accent, tokens.accent);
  const mainhand = state.slots.mainhand;
  const mount = state.slots.mount;
  const isEmpty = KILLBOARD_MATRIX.flat().every((slot) => state.slots[slot] === null) && mount === null;

  const hasAnySpell = KILLBOARD_MATRIX.flat().some((slot) => {
    const item = state.slots[slot];
    return item ? Object.values(item.spells).some((sprite) => sprite !== null) : false;
  });

  const hasMeta = mount !== null || state.swaps.length > 0;
  const visibleSwaps = state.swaps.slice(0, state.swaps.length > 3 ? 2 : 3);
  const remainingSwaps = state.swaps.length > 3 ? state.swaps.length - 2 : 0;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border"
      style={{ width: CARD_WIDTH, backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.fg }}
    >
      <div style={{ backgroundColor: accent, height: 4 }} />
      <div className="flex flex-col p-4" style={{ gap: 4 }}>
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: accent }}>
            {state.role || "Papel"}
          </span>
          {mainhand && mainhand.tier > 0 && (
            <span className="text-[12px]" style={{ color: tokens.fgMuted }}>
              T{mainhand.tier}
              {mainhand.enchant > 0 ? `.${mainhand.enchant}` : ""}
            </span>
          )}
        </div>
        <h2
          className="line-clamp-2 text-[20px] font-bold"
          style={{
            letterSpacing: "-0.01em",
            fontStyle: state.name ? "normal" : "italic",
            color: state.name ? tokens.fg : tokens.fgMuted,
          }}
        >
          {state.name || "Sem nome"}
        </h2>

        <div className="flex" style={{ gap: 16, marginTop: 12, justifyContent: hasMeta ? "flex-start" : "center" }}>
          <div
            className="grid"
            style={{
              width: MATRIX_COLUMN_PX,
              gridTemplateColumns: "repeat(3, 80px)",
              gridAutoRows: 93,
              gap: 8,
            }}
          >
            {KILLBOARD_MATRIX.flat().map((slot) => (
              <CompressedTile key={slot} slot={slot} item={state.slots[slot]} lookups={lookups} tokens={tokens} />
            ))}
          </div>

          {hasMeta && (
              <div className="flex flex-1 flex-col" style={{ gap: 12, minWidth: 0 }}>
                {hasAnySpell && (
                  <span className="text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: tokens.fgMuted }}>
                    Q W E P
                  </span>
                )}
                {mount && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: tokens.fgMuted }}>
                      Montaria
                    </span>
                    <div className="flex items-center gap-2">
                      <ItemIcon itemId={mount.itemId} alt={lookups.itemNames[mount.itemId] ?? mount.itemId} size="md" decorative />
                      <span className="text-[11px]" style={{ color: tokens.fg }}>
                        {lookups.itemNames[mount.itemId] ?? mount.itemId}
                        {mount.tier > 0 ? ` T${mount.tier}` : ""}
                      </span>
                    </div>
                  </div>
                )}
                {state.swaps.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.06em]" style={{ color: tokens.fgMuted }}>
                      Swaps
                    </span>
                    <ul className="flex flex-col gap-0.5">
                      {visibleSwaps.map((swap) => (
                        <li key={swap.id} className="line-clamp-1 text-[11px]" style={{ color: tokens.fgMuted }}>
                          • {swap.label}
                          {swapItemName(swap, lookups) ? `: ${swapItemName(swap, lookups)}` : ""}
                        </li>
                      ))}
                      {remainingSwaps > 0 && (
                        <li className="text-[11px]" style={{ color: tokens.fgMuted }}>
                          • +{remainingSwaps} swaps
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
          )}
        </div>

        {isEmpty && (
          <p className="text-[11px]" style={{ color: tokens.fgMuted, marginTop: 4 }}>
            Nenhum item equipado ainda — comece pela mão principal.
          </p>
        )}
      </div>
    </div>
  );
}
