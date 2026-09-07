import { ItemIcon } from "@/components/icons/ItemIcon";
import { SLOT_ORDER, type BuildState } from "@/types/build";
import { CardSlotTile } from "./CardSlotTile";
import { CARD_BORDER, CARD_FG, CARD_FG_MUTED, CARD_SURFACE, CARD_SURFACE_2, TIER_BADGE_TEXT, resolveAccent, tierColor } from "./tokens";
import type { BuildCardLookups, BuildCardTheme } from "./types";

export type BuildCardGridProps = {
  state: BuildState;
  theme: BuildCardTheme;
  lookups: BuildCardLookups;
};

/**
 * Narrow 320px column variant of the card, meant to sit side by side with
 * other builds in a comp (ACM-020 composes N of these; this component only
 * renders a single column — it does not lay out multiple builds itself).
 */
const COLUMN_WIDTH = 320;

export function BuildCardGrid({ state, theme, lookups }: BuildCardGridProps): React.JSX.Element {
  const accent = resolveAccent(state.role, state.accent);
  const mainhand = state.slots.mainhand;
  const equipmentSlots = SLOT_ORDER.filter((slot) => slot !== "mainhand" && state.slots[slot] !== null);

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border p-8"
      style={{ width: COLUMN_WIDTH, backgroundColor: CARD_SURFACE, borderColor: CARD_BORDER, color: CARD_FG }}
    >
      <span className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: accent }}>
        {state.role || "Papel"}
      </span>

      {mainhand ? (
        <>
          <div className="flex flex-col items-center gap-2">
            <div className="relative flex size-24 items-center justify-center rounded-md" style={{ backgroundColor: CARD_SURFACE_2 }}>
              <ItemIcon
                itemId={mainhand.itemId}
                alt={lookups.itemNames[mainhand.itemId] ?? mainhand.itemId}
                size="xl"
                decorative
              />
              {mainhand.tier > 0 && (
                <span
                  className="absolute bottom-0 left-0 rounded px-1 text-[10px] font-bold"
                  style={{ backgroundColor: tierColor(mainhand.tier), color: TIER_BADGE_TEXT, lineHeight: "16px" }}
                >
                  T{mainhand.tier}
                </span>
              )}
            </div>
            <p className="text-center text-[15px] font-semibold">{state.name || "Sem nome"}</p>
          </div>

          {equipmentSlots.length > 0 && (
            <div className="grid grid-cols-2 justify-items-center gap-3">
              {equipmentSlots.map((slot) => {
                const item = state.slots[slot];
                if (!item) return null;
                return (
                  <CardSlotTile
                    key={slot}
                    slot={slot}
                    item={item}
                    lookups={lookups}
                    showItemNames={theme.showItemNames}
                    showSpellNames={theme.showSpellNames}
                  />
                );
              })}
            </div>
          )}
        </>
      ) : (
        <p className="py-8 text-center text-[13px] italic" style={{ color: CARD_FG_MUTED }}>
          {state.name || "Sem nome"}
        </p>
      )}
    </div>
  );
}
