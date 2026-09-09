import { CategorySilhouette } from "@/components/icons/category-glyphs";
import { ItemIcon } from "@/components/icons/ItemIcon";
import type { Slot } from "@/data/ao-data";
import type { EquippedItem } from "@/types/build";
import { SLOT_CATEGORY, SLOT_LABELS } from "./slot-meta";
import { SpellRow } from "./SpellRow";
import type { BuildCardTokenSet } from "./theme-presets";
import { CARD_ENCHANT, TIER_BADGE_TEXT, tierColor } from "./tokens";
import type { BuildCardLookups } from "./types";
import { ALL_SPELL_GROUPS } from "./types";

/** Empty-slot category glyph size, sized to match `CompressedTile`'s ~0.39 glyph/box ratio. */
const EMPTY_GLYPH_PX = 32;

export type CardSlotTileProps = {
  slot: Slot;
  item: EquippedItem | null;
  lookups: BuildCardLookups;
  showItemNames: boolean;
  showSpellNames: boolean;
  tokens: BuildCardTokenSet;
};

/**
 * Fixed 80px equipment tile for the exported card. Distinct from the editor's
 * `SlotCard` (168px, has empty/hover/click states). `item === null` renders a
 * placeholder — dashed border + `SLOT_CATEGORY` silhouette glyph, matching
 * `CompressedTile`/`ListRow`'s already-established empty-slot pattern
 * (ACM-092 AC#3: partially filled builds must show empty slots, not drop
 * them). It has zero interactive affordances (no button, no onClick, no
 * hover style) since it lives inside the capture root.
 */
export function CardSlotTile({
  slot,
  item,
  lookups,
  showItemNames,
  showSpellNames,
  tokens,
}: CardSlotTileProps): React.JSX.Element {
  const label = SLOT_LABELS[slot] ?? slot;
  const itemName = item ? (lookups.itemNames[item.itemId] ?? item.itemId) : "";
  const spellGroups = item ? (lookups.spellGroupsByItem[item.itemId] ?? ALL_SPELL_GROUPS) : [];

  return (
    <div
      className="flex w-20 flex-col items-center gap-1"
      data-slot={slot}
      data-slot-state={item ? "filled" : "empty"}
      style={{ color: tokens.fg }}
    >
      <span
        className="text-center text-[10px] font-semibold uppercase tracking-[0.04em]"
        style={{ color: tokens.fgMuted }}
      >
        {label}
      </span>
      {item ? (
        <div
          className="relative flex size-20 items-center justify-center rounded-md"
          style={{ backgroundColor: tokens.surface2 }}
        >
          <ItemIcon itemId={item.itemId} alt={itemName} size="xl" decorative />
          {item.tier > 0 && (
            <span
              className="absolute bottom-0 left-0 rounded px-1 text-[10px] font-bold"
              style={{ backgroundColor: tierColor(item.tier), color: TIER_BADGE_TEXT, lineHeight: "16px" }}
            >
              T{item.tier}
            </span>
          )}
          {item.enchant > 0 && (
            <span
              className="absolute bottom-0 right-0 rounded px-1 text-[10px] font-bold"
              style={{ backgroundColor: CARD_ENCHANT, color: "#ffffff", lineHeight: "16px" }}
            >
              .{item.enchant}
            </span>
          )}
        </div>
      ) : (
        <div
          className="flex size-20 items-center justify-center rounded-md"
          style={{ backgroundColor: tokens.surface2, border: `1px dashed ${tokens.slotEmptyBorder}` }}
        >
          <span style={{ opacity: 0.28 }}>
            <CategorySilhouette category={SLOT_CATEGORY[slot]} size={EMPTY_GLYPH_PX} />
          </span>
        </div>
      )}
      {showItemNames &&
        (item ? (
          <p className="line-clamp-2 text-center text-[11px] leading-tight" title={itemName}>
            {itemName}
          </p>
        ) : (
          <p className="text-center text-[11px] italic" style={{ color: tokens.fgMuted }}>
            Vazio
          </p>
        ))}
      {item && spellGroups.length > 0 && (
        <SpellRow
          item={item}
          itemName={itemName}
          spellGroups={spellGroups}
          lookups={lookups}
          size="sm"
          showSpellNames={showSpellNames}
          fgMuted={tokens.fgMuted}
        />
      )}
    </div>
  );
}
