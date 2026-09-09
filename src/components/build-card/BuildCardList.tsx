import { ItemIcon } from "@/components/icons/ItemIcon";
import { SLOT_ORDER, type BuildState, type Swap } from "@/types/build";
import { ListRow } from "./ListRow";
import type { BuildCardTokenSet } from "./theme-presets";
import { resolveAccent } from "./tokens";
import type { BuildCardLookups, BuildCardTheme } from "./types";

export type BuildCardListProps = {
  state: BuildState;
  theme: BuildCardTheme;
  lookups: BuildCardLookups;
  tokens: BuildCardTokenSet;
};

/** Fixed logical width (doc-006 §3.1): 480px, height grows with the swap list. */
const CARD_WIDTH = 480;

function swapItemName(swap: Swap, lookups: BuildCardLookups): string {
  for (const item of Object.values(swap.slots)) {
    if (item) return lookups.itemNames[item.itemId] ?? item.itemId;
  }
  return "";
}

/**
 * All-10-slots equipment list (doc-006 §3): the "copy the build item by
 * item" reading mode. Always shows every `SLOT_ORDER` slot, filled or empty,
 * with the item name visible — the opposite trade-off from `BuildCardGrid`
 * (icon-only, drops empty slots), which is why it is its own component and
 * not a theme flag on an existing layout (doc-006 §5).
 */
export function BuildCardList({ state, theme, lookups, tokens }: BuildCardListProps): React.JSX.Element {
  const accent = resolveAccent(state.role, state.accent, tokens.accent);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border"
      style={{ width: CARD_WIDTH, backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.fg }}
    >
      <div style={{ backgroundColor: accent, height: 4 }} />
      <div className="flex flex-col p-4" style={{ gap: 4 }}>
        <span className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: accent }}>
          {state.role || "Papel"}
        </span>
        <h2 className="line-clamp-2 text-[18px] font-bold" style={{ letterSpacing: "-0.01em" }}>
          {state.name || "Sem nome"}
        </h2>

        <div className="flex flex-col" style={{ marginTop: 8 }}>
          {SLOT_ORDER.map((slot, index) => (
            <ListRow
              key={slot}
              slot={slot}
              item={state.slots[slot]}
              lookups={lookups}
              showSpellNames={theme.showSpellNames}
              withDivider={index > 0}
              tokens={tokens}
            />
          ))}
        </div>

        {state.swaps.length > 0 && (
          <div className="flex flex-col" style={{ borderTop: `1px solid ${tokens.border}`, marginTop: 12, paddingTop: 8, gap: 8 }}>
            <span className="text-[9px] font-bold uppercase tracking-[0.06em]" style={{ color: tokens.fgMuted }}>
              Swaps
            </span>
            {state.swaps.map((swap) => {
              const itemName = swapItemName(swap, lookups);
              const firstItem = Object.values(swap.slots).find((item) => item !== null) ?? null;
              return (
                <div key={swap.id} className="flex items-center gap-3">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: "transparent" }}
                  >
                    {/* `sm` (32px) matches the `size-8` (32px) wrapper — `xs` (24px) left visible
                        padding inside the wrapper that no other icon+wrapper pairing in this
                        file has (ACM-080 finding). */}
                    {firstItem && <ItemIcon itemId={firstItem.itemId} alt={itemName} size="sm" decorative />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span
                      className="text-[9px] font-bold uppercase tracking-[0.06em]"
                      style={{ color: tokens.fgMuted }}
                    >
                      {swap.label}
                    </span>
                    {itemName && (
                      <p className="line-clamp-1 text-[13px] font-semibold" style={{ color: tokens.fg }}>
                        {itemName}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
