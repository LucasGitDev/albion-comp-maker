import { ItemIcon } from "@/components/icons/ItemIcon";
import type { Slot } from "@/data/ao-data";
import type { EquippedItem } from "@/types/build";
import { CARD_ENCHANT, CARD_FG, CARD_FG_MUTED, CARD_PLACEHOLDER, CARD_SURFACE_2, TIER_BADGE_TEXT, tierColor } from "./tokens";
import { SpellRow } from "./SpellRow";
import type { BuildCardLookups } from "./types";
import { ALL_SPELL_GROUPS } from "./types";

const SLOT_LABELS: Record<Slot, string> = {
  mainhand: "Mão principal",
  offhand: "Mão secundária",
  head: "Cabeça",
  armor: "Peito",
  shoes: "Botas",
  cape: "Capa",
  bag: "Bolsa",
  mount: "Montaria",
  food: "Comida",
  potion: "Poção",
};

export type CardSlotTileProps = {
  slot: Slot;
  item: EquippedItem;
  lookups: BuildCardLookups;
  showItemNames: boolean;
  showSpellNames: boolean;
};

/**
 * Fixed 80px equipment tile for the exported card. Distinct from the editor's
 * `SlotCard` (168px, has empty/hover/click states): this tile only renders a
 * filled item — the export drops empty slots entirely (see ACM-013 spec §2),
 * and it has zero interactive affordances (no button, no onClick, no hover
 * style) since it lives inside the capture root.
 */
export function CardSlotTile({
  slot,
  item,
  lookups,
  showItemNames,
  showSpellNames,
}: CardSlotTileProps): React.JSX.Element {
  const label = SLOT_LABELS[slot] ?? slot;
  const itemName = lookups.itemNames[item.itemId] ?? item.itemId;
  const spellGroups = lookups.spellGroupsByItem[item.itemId] ?? ALL_SPELL_GROUPS;

  return (
    <div
      className="flex w-20 flex-col items-center gap-1"
      data-slot={slot}
      style={{ color: CARD_FG }}
    >
      <span
        className="text-center text-[10px] font-semibold uppercase tracking-[0.04em]"
        style={{ color: CARD_FG_MUTED }}
      >
        {label}
      </span>
      <div
        className="relative flex size-20 items-center justify-center rounded-md"
        style={{ backgroundColor: CARD_SURFACE_2 }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-md"
          style={{ backgroundColor: CARD_PLACEHOLDER, opacity: 0 }}
        />
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
      {showItemNames && (
        <p className="line-clamp-2 text-center text-[11px] leading-tight" title={itemName}>
          {itemName}
        </p>
      )}
      {spellGroups.length > 0 && (
        <SpellRow
          item={item}
          itemName={itemName}
          spellGroups={spellGroups}
          lookups={lookups}
          size="sm"
          showSpellNames={showSpellNames}
        />
      )}
    </div>
  );
}
