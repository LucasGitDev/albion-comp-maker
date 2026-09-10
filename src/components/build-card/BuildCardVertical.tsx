import { CategorySilhouette } from "@/components/icons/category-glyphs";
import { ItemIcon } from "@/components/icons/ItemIcon";
import { SLOT_ORDER, type BuildState } from "@/types/build";
import { CardSlotTile } from "./CardSlotTile";
import { SLOT_CATEGORY } from "./slot-meta";
import { SpellRow } from "./SpellRow";
import type { BuildCardTokenSet } from "./theme-presets";
import { TIER_BADGE_TEXT, resolveAccent, tierColor } from "./tokens";
import { ALL_SPELL_GROUPS, type BuildCardLookups, type BuildCardTheme } from "./types";

export type BuildCardVerticalProps = {
  state: BuildState;
  theme: BuildCardTheme;
  lookups: BuildCardLookups;
  tokens: BuildCardTokenSet;
  /** See `BuildCardProps.hideEmptySlots` (ACM-122). */
  hideEmptySlots?: boolean;
};

/** Fixed logical width (§1 of the ACM-013 spec): 960px, scale:2 on export → 1920px PNG. */
const CARD_WIDTH = 960;

export function BuildCardVertical({
  state,
  theme,
  lookups,
  tokens,
  hideEmptySlots = false,
}: BuildCardVerticalProps): React.JSX.Element {
  const accent = resolveAccent(state.role, state.accent, tokens.accent);
  const mainhand = state.slots.mainhand;
  const equipmentSlots = SLOT_ORDER.filter(
    (slot) => slot !== "mainhand" && (!hideEmptySlots || state.slots[slot] !== null)
  );
  const hideMainhandEmpty = hideEmptySlots && mainhand === null;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border"
      style={{ width: CARD_WIDTH, backgroundColor: tokens.surface, borderColor: tokens.border, color: tokens.fg }}
    >
      <div style={{ backgroundColor: accent, height: 6 }} />
      <div className="flex flex-col gap-6 p-10">
        <span className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: accent }}>
          {state.role || "Papel"}
        </span>

        <div className="flex gap-6">
          {mainhand ? (
            <div
              className="relative flex size-36 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: tokens.surface2 }}
            >
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
              {mainhand.enchant > 0 && (
                <span
                  className="absolute bottom-0 right-0 rounded px-1 text-[10px] font-bold"
                  style={{ backgroundColor: "#3f8f4a", color: "#ffffff", lineHeight: "16px" }}
                >
                  .{mainhand.enchant}
                </span>
              )}
            </div>
          ) : hideMainhandEmpty ? null : (
            <div
              className="flex size-36 shrink-0 items-center justify-center rounded-md"
              style={{ backgroundColor: tokens.surface2, border: `1px dashed ${tokens.slotEmptyBorder}` }}
              data-slot="mainhand"
              data-slot-state="empty"
            >
              <span style={{ opacity: 0.28 }}>
                <CategorySilhouette category={SLOT_CATEGORY.mainhand} size={56} />
              </span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <h2 className="text-[30px] font-bold" style={{ letterSpacing: "-0.01em" }}>
              {state.name || "Sem nome"}
            </h2>
            {mainhand ? (
              <p className="text-[15px] font-medium" style={{ color: tokens.fgMuted }}>
                {lookups.itemNames[mainhand.itemId] ?? mainhand.itemId}
                {mainhand.tier > 0 ? ` · T${mainhand.tier}${mainhand.enchant > 0 ? `.${mainhand.enchant}` : ""}` : ""}
              </p>
            ) : (
              <p className="text-[15px] font-medium italic" style={{ color: tokens.fgMuted }}>
                Vazio
              </p>
            )}
            {mainhand && (
              <SpellRow
                item={mainhand}
                itemName={lookups.itemNames[mainhand.itemId] ?? mainhand.itemId}
                spellGroups={lookups.spellGroupsByItem[mainhand.itemId] ?? ALL_SPELL_GROUPS}
                lookups={lookups}
                size="lg"
                showSpellNames={theme.showSpellNames}
                fgMuted={tokens.fgMuted}
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <hr style={{ borderColor: tokens.border }} />
          <span className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: tokens.fgMuted }}>
            Equipamento
          </span>
          <div className="flex flex-wrap gap-3">
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

        {state.swaps.length > 0 && (
          <div className="flex flex-col gap-2">
            <hr style={{ borderColor: tokens.border }} />
            <span className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: tokens.fgMuted }}>
              Swaps obrigatórios
            </span>
            <ul className="flex flex-col gap-1">
              {state.swaps.map((swap) => (
                <li key={swap.id} className="text-[13px]" style={{ color: tokens.fgMuted }}>
                  {swap.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <span className="text-[11px]" style={{ color: tokens.fgMuted, opacity: 0.4 }}>
            albioncomp.gg
          </span>
        </div>
      </div>
    </div>
  );
}
