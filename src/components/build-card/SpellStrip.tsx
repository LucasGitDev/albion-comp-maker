import { SpellIcon } from "@/components/icons/SpellIcon";
import { ICON_SIZE_PX } from "@/components/icons/icon-tokens";
import type { EquippedItem, SpellGroup } from "@/types/build";
import { SPELL_GROUP_ORDER } from "./types";

export type SpellStripProps = {
  item: EquippedItem;
  itemName: string;
  spellGroups: readonly SpellGroup[];
};

const CHIP_PX = ICON_SIZE_PX.xxs;

/**
 * Fixed-position Q/W/E/Passive strip for the Compressed tile (doc-006 §2.4).
 * Deliberately not `SpellRow`: `SpellRow` only renders the groups an item
 * exposes, so an item missing `W` shifts `E`/Passive one slot left — fine at
 * `SpellRow`'s call sites (item name is visible, position isn't load-bearing)
 * but wrong here, where the whole point of the Compressed layout is reading
 * spells by fixed position without a legend. This always renders exactly 4
 * slots: a group the item doesn't expose at all renders an invisible 18px
 * placeholder (keeps the column width stable) instead of collapsing.
 */
export function SpellStrip({ item, itemName, spellGroups }: SpellStripProps): React.JSX.Element {
  return (
    <div className="flex gap-0.5" style={{ height: CHIP_PX }}>
      {SPELL_GROUP_ORDER.map(({ group, label }) => {
        const hasGroup = spellGroups.includes(group);
        if (!hasGroup) {
          return (
            <span
              key={group}
              aria-hidden="true"
              data-spell-slot={group}
              data-spell-slot-state="absent"
              style={{ width: CHIP_PX, height: CHIP_PX, visibility: "hidden" }}
            />
          );
        }
        const sprite = item.spells[group];
        return (
          <span key={group} data-spell-slot={group} data-spell-slot-state={sprite ? "filled" : "empty"}>
            <SpellIcon
              sprite={sprite}
              alt={`${label} de ${itemName}`}
              size="xxs"
              slotLabel={label}
              decorative
            />
          </span>
        );
      })}
    </div>
  );
}
