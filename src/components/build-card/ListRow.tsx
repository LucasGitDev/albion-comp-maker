import { CategorySilhouette } from "@/components/icons/category-glyphs";
import { ItemIcon } from "@/components/icons/ItemIcon";
import { SpellIcon } from "@/components/icons/SpellIcon";
import type { Slot } from "@/data/ao-data";
import type { EquippedItem } from "@/types/build";
import { SLOT_CATEGORY, SLOT_LABELS } from "./slot-meta";
import type { BuildCardTokenSet } from "./theme-presets";
import { TIER_BADGE_TEXT, tierColor } from "./tokens";
import { ALL_SPELL_GROUPS, SPELL_GROUP_ORDER, type BuildCardLookups } from "./types";

export type ListRowProps = {
  slot: Slot;
  item: EquippedItem | null;
  lookups: BuildCardLookups;
  showSpellNames: boolean;
  /** `false` for the first row of a list — it has no divider above it. */
  withDivider: boolean;
  tokens: BuildCardTokenSet;
};

const ROW_HEIGHT_WITH_SPELLS = 64;
const ROW_HEIGHT_WITHOUT_SPELLS = 48;
const ICON_BOX_PX = 40;
const EMPTY_GLYPH_PX = 20;

/**
 * One 64px/48px horizontal row in the List layout (doc-006 §3.1, §5).
 * Unlike `CardSlotTile`, this always renders — filled or empty — because the
 * List's entire purpose is showing all 10 slots with the item name visible;
 * dropping empty rows (what `CardSlotTile`'s callers do today) would make it
 * indistinguishable from a denser `BuildCardVertical`.
 */
export function ListRow({ slot, item, lookups, showSpellNames, withDivider, tokens }: ListRowProps): React.JSX.Element {
  const label = SLOT_LABELS[slot] ?? slot;
  const itemName = item ? (lookups.itemNames[item.itemId] ?? item.itemId) : "";
  const spellGroups = item ? (lookups.spellGroupsByItem[item.itemId] ?? ALL_SPELL_GROUPS) : [];
  const hasSpells = spellGroups.length > 0;
  const rowHeight = item && hasSpells ? ROW_HEIGHT_WITH_SPELLS : ROW_HEIGHT_WITHOUT_SPELLS;
  const groups = SPELL_GROUP_ORDER.filter(({ group }) => spellGroups.includes(group));
  const showNames = showSpellNames && groups.length > 0 && groups.length <= 2;

  return (
    <div
      className="flex items-center gap-3"
      data-slot={slot}
      data-slot-state={item ? "filled" : "empty"}
      style={{ height: rowHeight, borderTop: withDivider ? `1px solid ${tokens.rowDivider}` : undefined }}
    >
      {item ? (
        <div
          className="relative flex shrink-0 items-center justify-center rounded-md"
          style={{ width: ICON_BOX_PX, height: ICON_BOX_PX, backgroundColor: tokens.surface2 }}
        >
          <ItemIcon itemId={item.itemId} alt={itemName} size="sm" decorative />
        </div>
      ) : (
        <div
          className="flex shrink-0 items-center justify-center rounded-md"
          style={{
            width: ICON_BOX_PX,
            height: ICON_BOX_PX,
            backgroundColor: tokens.surface2,
            border: `1px dashed ${tokens.slotEmptyBorder}`,
          }}
        >
          <span style={{ opacity: 0.28 }}>
            <CategorySilhouette category={SLOT_CATEGORY[slot]} size={EMPTY_GLYPH_PX} />
          </span>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="text-[9px] font-bold uppercase tracking-[0.06em]"
          style={{ color: tokens.fgMuted }}
        >
          {label}
        </span>
        {item ? (
          <p className="line-clamp-1 text-[13px] font-semibold" style={{ color: tokens.fg }} title={itemName}>
            {itemName}
          </p>
        ) : (
          <p className="text-[13px] italic" style={{ color: tokens.fgMuted }}>
            Vazio
          </p>
        )}
        {item && hasSpells && (
          <div className="flex items-center gap-1">
            {groups.map(({ group, label: groupLabel }) => {
              const sprite = item.spells[group];
              const spellName = sprite ? lookups.spellNames[sprite] : undefined;
              return (
                <span key={group} className="flex items-center gap-1">
                  <SpellIcon sprite={sprite} alt={`${groupLabel} de ${itemName}`} size="xs" slotLabel={groupLabel} decorative />
                  {showNames && (
                    <span className="text-[10px]" style={{ color: tokens.fgMuted }}>
                      {spellName ?? ""}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {item && item.tier > 0 && (
        <span
          className="shrink-0 self-start rounded px-1.5 text-[11px] font-bold"
          style={{ backgroundColor: tierColor(item.tier), color: TIER_BADGE_TEXT }}
        >
          T{item.tier}
          {item.enchant > 0 ? `.${item.enchant}` : ""}
        </span>
      )}
    </div>
  );
}
