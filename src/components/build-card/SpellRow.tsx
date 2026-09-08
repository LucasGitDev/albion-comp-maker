import { SpellIcon } from "@/components/icons/SpellIcon";
import { ICON_SIZE_PX, type IconSize } from "@/components/icons/icon-tokens";
import type { EquippedItem, SpellGroup } from "@/types/build";
import { CARD_FG_MUTED } from "./tokens";
import { SPELL_GROUP_ORDER, type BuildCardLookups } from "./types";

export type SpellRowProps = {
  item: EquippedItem;
  itemName: string;
  spellGroups: readonly SpellGroup[];
  lookups: BuildCardLookups;
  size: IconSize;
  showSpellNames: boolean;
  /** Themed muted-text color (ACM-014). Defaults to the untheme'd `dark-purple` value. */
  fgMuted?: string;
};

/** Non-interactive row of spell chips shared by the hero weapon and the equipment tiles. */
export function SpellRow({
  item,
  itemName,
  spellGroups,
  lookups,
  size,
  showSpellNames,
  fgMuted = CARD_FG_MUTED,
}: SpellRowProps): React.JSX.Element | null {
  const groups = SPELL_GROUP_ORDER.filter(({ group }) => spellGroups.includes(group));
  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-1">
        {groups.map(({ group, label }) => {
          const sprite = item.spells[group];
          return (
            <SpellIcon
              key={group}
              sprite={sprite}
              alt={`${label} de ${itemName}`}
              size={size}
              slotLabel={label}
              decorative
            />
          );
        })}
      </div>
      {showSpellNames && (
        <div className="flex flex-wrap gap-1">
          {groups.map(({ group }) => {
            const sprite = item.spells[group];
            const name = sprite ? lookups.spellNames[sprite] : undefined;
            return (
              <span
                key={group}
                className="text-center text-[11px] leading-tight"
                style={{ color: fgMuted, width: ICON_SIZE_PX[size] }}
              >
                {name ?? ""}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
