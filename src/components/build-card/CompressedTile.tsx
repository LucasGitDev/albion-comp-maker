import { CategorySilhouette } from "@/components/icons/category-glyphs";
import { ItemIcon } from "@/components/icons/ItemIcon";
import type { Slot } from "@/data/ao-data";
import type { EquippedItem } from "@/types/build";
import { SpellStrip } from "./SpellStrip";
import { SLOT_CATEGORY } from "./slot-meta";
import { CARD_ENCHANT, CARD_SLOT_EMPTY_BORDER, CARD_SURFACE_2, TIER_BADGE_TEXT, tierColor } from "./tokens";
import { ALL_SPELL_GROUPS, type BuildCardLookups } from "./types";

export type CompressedTileProps = {
  slot: Slot;
  item: EquippedItem | null;
  lookups: BuildCardLookups;
};

/** Icon box side (doc-006 §2.2). */
const BOX_PX = 72;
/**
 * Icon rendered at `lg` (56px) rather than the spec's literal 64px: the
 * component's icon-size scale (`ICON_SIZE_PX`) only has discrete steps, and
 * this task's authorized token additions (doc-006 §5) are limited to
 * `xxs: 18` — adding another step for a single 8px difference was judged out
 * of scope. `lg` is the largest existing step that still fits inside the
 * 72px box.
 */
const ICON_SIZE = "lg" as const;
/** Empty-slot category glyph size (doc-006 §2.7). */
const GLYPH_PX = 28;

/**
 * Fixed 80x93 matrix cell for the Compressed layout (doc-006 §2.2, §5).
 * Distinct from `CardSlotTile`: that component has a variable-height text
 * label and drops empty slots entirely, both wrong for a killboard-style
 * paperdoll where the grid position itself is the label and must never
 * collapse (doc-006 §2.7 "Slot vazio" never disappears from the grid).
 */
export function CompressedTile({ slot, item, lookups }: CompressedTileProps): React.JSX.Element {
  const itemName = item ? (lookups.itemNames[item.itemId] ?? item.itemId) : "";
  const spellGroups = item ? (lookups.spellGroupsByItem[item.itemId] ?? ALL_SPELL_GROUPS) : [];

  return (
    <div
      className="flex flex-col items-center"
      style={{ width: 80, height: 93 }}
      data-slot={slot}
      data-slot-state={item ? "filled" : "empty"}
    >
      {item ? (
        <div
          className="relative flex items-center justify-center"
          style={{ width: BOX_PX, height: BOX_PX, backgroundColor: CARD_SURFACE_2, borderRadius: 8 }}
        >
          <ItemIcon itemId={item.itemId} alt={itemName} size={ICON_SIZE} decorative />
          {item.tier > 0 && (
            <span
              className="absolute bottom-0 left-0 rounded px-1 text-[10px] font-bold"
              style={{ backgroundColor: tierColor(item.tier), color: TIER_BADGE_TEXT, lineHeight: "14px", borderRadius: 3 }}
            >
              T{item.tier}
            </span>
          )}
          {item.enchant > 0 && (
            <span
              className="absolute right-0 bottom-0 rounded px-1 text-[10px] font-bold"
              style={{ backgroundColor: CARD_ENCHANT, color: "#ffffff", lineHeight: "14px", borderRadius: 3 }}
            >
              .{item.enchant}
            </span>
          )}
        </div>
      ) : (
        <div
          className="flex items-center justify-center"
          style={{
            width: BOX_PX,
            height: BOX_PX,
            backgroundColor: CARD_SURFACE_2,
            borderRadius: 8,
            border: `1px dashed ${CARD_SLOT_EMPTY_BORDER}`,
          }}
        >
          <span style={{ opacity: 0.28 }}>
            <CategorySilhouette category={SLOT_CATEGORY[slot]} size={GLYPH_PX} />
          </span>
        </div>
      )}

      <div style={{ height: 3 }} />

      {item ? (
        <SpellStrip item={item} itemName={itemName} spellGroups={spellGroups} />
      ) : (
        <span aria-hidden="true" style={{ height: 18 }} />
      )}
    </div>
  );
}
