import { ItemIcon } from "@/components/icons/ItemIcon";
import { SLOT_ORDER, type BuildState } from "@/types/build";
import { CardSlotTile } from "./CardSlotTile";
import { SpellRow } from "./SpellRow";
import {
  CARD_BORDER,
  CARD_FG,
  CARD_FG_MUTED,
  CARD_SURFACE,
  CARD_SURFACE_2,
  TIER_BADGE_TEXT,
  resolveAccent,
  tierColor,
} from "./tokens";
import { ALL_SPELL_GROUPS, type BuildCardLookups, type BuildCardTheme } from "./types";

export type BuildCardVerticalProps = {
  state: BuildState;
  theme: BuildCardTheme;
  lookups: BuildCardLookups;
};

/** Fixed logical width (§1 of the ACM-013 spec): 960px, scale:2 on export → 1920px PNG. */
const CARD_WIDTH = 960;

export function BuildCardVertical({ state, theme, lookups }: BuildCardVerticalProps): React.JSX.Element {
  const accent = resolveAccent(state.role, state.accent);
  const mainhand = state.slots.mainhand;
  const equipmentSlots = SLOT_ORDER.filter((slot) => slot !== "mainhand" && state.slots[slot] !== null);
  const hasBuild = mainhand !== null;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border"
      style={{ width: CARD_WIDTH, backgroundColor: CARD_SURFACE, borderColor: CARD_BORDER, color: CARD_FG }}
    >
      <div style={{ backgroundColor: accent, height: 6 }} />
      <div className="flex flex-col gap-6 p-10">
        <span
          className="text-[12px] font-bold uppercase tracking-[0.08em]"
          style={{ color: accent }}
        >
          {state.role || "Papel"}
        </span>

        {!hasBuild ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div
              className="flex size-24 items-center justify-center rounded-md opacity-10"
              style={{ backgroundColor: CARD_SURFACE_2 }}
            >
              <ItemIcon itemId="" alt="" size="xl" decorative />
            </div>
            <p className="text-[15px] italic" style={{ color: CARD_FG_MUTED }}>
              {state.name || "Sem nome"}
            </p>
            <p className="text-[13px]" style={{ color: CARD_FG_MUTED }}>
              Escolha a mão principal para ver o card
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-6">
              <div className="relative flex size-36 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: CARD_SURFACE_2 }}>
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
              <div className="flex flex-col gap-2">
                <h2 className="text-[30px] font-bold" style={{ letterSpacing: "-0.01em" }}>
                  {state.name || "Sem nome"}
                </h2>
                <p className="text-[15px] font-medium" style={{ color: CARD_FG_MUTED }}>
                  {lookups.itemNames[mainhand.itemId] ?? mainhand.itemId}
                  {mainhand.tier > 0 ? ` · T${mainhand.tier}${mainhand.enchant > 0 ? `.${mainhand.enchant}` : ""}` : ""}
                </p>
                <SpellRow
                  item={mainhand}
                  itemName={lookups.itemNames[mainhand.itemId] ?? mainhand.itemId}
                  spellGroups={lookups.spellGroupsByItem[mainhand.itemId] ?? ALL_SPELL_GROUPS}
                  lookups={lookups}
                  size="lg"
                  showSpellNames={theme.showSpellNames}
                />
              </div>
            </div>

            {equipmentSlots.length > 0 && (
              <div className="flex flex-col gap-3">
                <hr style={{ borderColor: CARD_BORDER }} />
                <span className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: CARD_FG_MUTED }}>
                  Equipamento
                </span>
                <div className="flex flex-wrap gap-3">
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
              </div>
            )}

            {state.swaps.length > 0 && (
              <div className="flex flex-col gap-2">
                <hr style={{ borderColor: CARD_BORDER }} />
                <span className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: CARD_FG_MUTED }}>
                  Swaps obrigatórios
                </span>
                <ul className="flex flex-col gap-1">
                  {state.swaps.map((swap) => (
                    <li key={swap.id} className="text-[13px]" style={{ color: CARD_FG_MUTED }}>
                      {swap.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end pt-2">
          <span className="text-[11px]" style={{ color: CARD_FG_MUTED, opacity: 0.4 }}>
            albioncomp.gg
          </span>
        </div>
      </div>
    </div>
  );
}
