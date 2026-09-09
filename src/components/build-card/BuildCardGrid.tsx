import { CategorySilhouette } from "@/components/icons/category-glyphs";
import { ItemIcon } from "@/components/icons/ItemIcon";
import { SLOT_ORDER, type BuildState } from "@/types/build";
import { CardSlotTile } from "./CardSlotTile";
import { SLOT_CATEGORY } from "./slot-meta";
import type { BuildCardTokenSet } from "./theme-presets";
import { TIER_BADGE_TEXT, resolveAccent, tierColor } from "./tokens";
import type { BuildCardLookups, BuildCardTheme } from "./types";

export type BuildCardGridProps = {
  state: BuildState;
  theme: BuildCardTheme;
  lookups: BuildCardLookups;
  tokens: BuildCardTokenSet;
};

/**
 * Narrow 320px column variant of the card, meant to sit side by side with
 * other builds in a comp (ACM-020 composes N of these; this component only
 * renders a single column — it does not lay out multiple builds itself).
 */
const COLUMN_WIDTH = 320;

export function BuildCardGrid({ state, theme, lookups, tokens }: BuildCardGridProps): React.JSX.Element {
  const accent = resolveAccent(state.role, state.accent, tokens.accent);
  const mainhand = state.slots.mainhand;
  const equipmentSlots = SLOT_ORDER.filter((slot) => slot !== "mainhand");

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border p-8"
      style={{ width: COLUMN_WIDTH, backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.fg }}
    >
      <span className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: accent }}>
        {state.role || "Papel"}
      </span>

      <div className="flex flex-col items-center gap-2">
        {mainhand ? (
          <div className="relative flex size-24 items-center justify-center rounded-md" style={{ backgroundColor: tokens.surface2 }}>
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
        ) : (
          <div
            className="flex size-24 items-center justify-center rounded-md"
            style={{ backgroundColor: tokens.surface2, border: `1px dashed ${tokens.slotEmptyBorder}` }}
            data-slot="mainhand"
            data-slot-state="empty"
          >
            <span style={{ opacity: 0.28 }}>
              <CategorySilhouette category={SLOT_CATEGORY.mainhand} size={38} />
            </span>
          </div>
        )}
        <p
          className="text-center text-[15px] font-semibold"
          style={{ fontStyle: mainhand ? "normal" : "italic", color: mainhand ? tokens.fg : tokens.fgMuted }}
        >
          {state.name || "Sem nome"}
        </p>
      </div>

      <div className="grid grid-cols-2 justify-items-center gap-3">
        {equipmentSlots.map((slot) => (
          <CardSlotTile
            key={slot}
            slot={slot}
            item={state.slots[slot]}
            lookups={lookups}
            showItemNames={theme.showItemNames}
            showSpellNames={theme.showSpellNames}
            tokens={tokens}
          />
        ))}
      </div>
    </div>
  );
}
