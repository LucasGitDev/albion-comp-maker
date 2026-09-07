"use client";

import type { Slot } from "@/data/ao-data";
import { ItemIcon } from "@/components/icons/ItemIcon";
import { CategorySilhouette, type IconCategory } from "@/components/icons/category-glyphs";
import type { EquippedItem, SpellGroup } from "@/types/build";
import type { SpellCandidate } from "./spell-groups";
import { SpellPicker } from "./SpellPicker";
import { EnchantSelect, TierSelect } from "./TierEnchantSelectors";
import type { EnchantOption, TierOption } from "./tier-enchant";

export const SLOT_LABELS: Record<Slot, string> = {
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

const TIER_COLOR_VAR: Record<number, string> = {
  4: "var(--color-tier-4)",
  5: "var(--color-tier-5)",
  6: "var(--color-tier-6)",
  7: "var(--color-tier-7)",
  8: "var(--color-tier-8)",
};

export type SlotCardProps = {
  slot: Slot;
  item: EquippedItem | null;
  itemName?: string;
  /**
   * Candidate spells the equipped item actually exposes, keyed by group
   * (ACM-010). A group absent here renders no row at all — the product's
   * differentiator is never offering an ability the item doesn't have.
   * Omitted or empty hides the spell picker entirely (no catalogue data).
   */
  spellCandidatesByGroup?: Partial<Record<SpellGroup, readonly SpellCandidate[]>>;
  /** true when this is the offhand slot and mainhand holds a two-handed item. */
  locked?: boolean;
  /**
   * Tier variants of the equipped item derived from the ao-data catalogue
   * (ACM-009 AC #1). Omitted or empty hides the tier selector — SlotCard
   * never fetches the catalogue itself.
   */
  tierOptions?: readonly TierOption[];
  /**
   * Enchant levels available for the equipped item, derived by the caller
   * from `AOItem.maxEnchant` (ACM-031 AC#1). Omitted, empty, or a single
   * `[0]` entry hides the enchant selector — items with `maxEnchant` 0
   * (mounts, food, potions) never show one (AC#2).
   */
  enchantOptions?: readonly EnchantOption[];
  onRequestItemPick: (slot: Slot) => void;
  onClear?: (slot: Slot) => void;
  onTierChange?: (slot: Slot, option: TierOption) => void;
  onEnchantChange?: (slot: Slot, enchant: EnchantOption) => void;
  onSpellChange?: (slot: Slot, group: SpellGroup, spellId: string | null) => void;
};

type SlotCategory = Exclude<IconCategory, "generic">;

const SLOT_CATEGORY: Record<Slot, SlotCategory> = {
  mainhand: "weapon",
  offhand: "weapon",
  head: "armor",
  armor: "armor",
  shoes: "armor",
  cape: "utility",
  bag: "utility",
  mount: "utility",
  food: "consumable",
  potion: "consumable",
};

/**
 * Neutral per-category silhouette for empty slots (ACM-035), reusing the
 * same glyph set `ItemIcon` falls back to for a 1x1 CDN miss (ACM-044) so
 * the two placeholder states never drift visually. Deliberately never
 * renders `ItemIcon`: an empty slot has no `itemId`, and `ItemIcon` treats
 * an empty id as an invalid one, forcing the error glyph/red ring.
 */
function SlotPlaceholderIcon({ category }: { category: SlotCategory }): React.JSX.Element {
  return (
    <span data-slot-placeholder={category}>
      <CategorySilhouette category={category} size={32} />
    </span>
  );
}

export function SlotCard({
  slot,
  item,
  itemName,
  spellCandidatesByGroup = {},
  locked = false,
  tierOptions = [],
  enchantOptions = [],
  onRequestItemPick,
  onClear,
  onTierChange,
  onEnchantChange,
  onSpellChange,
}: SlotCardProps): React.JSX.Element {
  const label = SLOT_LABELS[slot] ?? slot;
  const tierColor = item && item.tier > 0 ? (TIER_COLOR_VAR[item.tier] ?? "var(--color-tier-low)") : undefined;

  if (locked) {
    return (
      <div
        className="flex w-full md:max-w-[168px] cursor-not-allowed flex-col gap-2 rounded-xl border border-icon-slot-empty bg-icon-slot p-3 opacity-60"
        data-slot={slot}
        data-slot-state="locked"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
          {label}
        </span>
        <div className="flex size-24 items-center justify-center rounded-md bg-icon-placeholder">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="text-icon-muted"
          >
            <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </div>
        <p className="text-[12px] text-icon-muted">Ocupada por arma de duas mãos</p>
      </div>
    );
  }

  if (!item) {
    return (
      <button
        type="button"
        onClick={() => onRequestItemPick(slot)}
        className="flex w-full md:max-w-[168px] flex-col gap-2 rounded-xl border border-dashed border-icon-slot-empty bg-icon-slot p-3 text-left transition-colors duration-150 ease-out hover:border-solid hover:border-[var(--color-enchant)]"
        data-slot={slot}
        data-slot-state="empty"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
          {label}
        </span>
        <div className="flex size-24 items-center justify-center rounded-md bg-icon-placeholder opacity-40">
          <SlotPlaceholderIcon category={SLOT_CATEGORY[slot] ?? "weapon"} />
        </div>
        <span className="text-[12px] text-icon-muted transition-colors duration-150 ease-out hover:text-[var(--color-enchant)]">
          Adicionar
        </span>
      </button>
    );
  }

  return (
    <div
      className="group relative flex w-full md:max-w-[168px] flex-col gap-2 rounded-xl border border-icon-slot-empty bg-icon-slot p-3"
      data-slot={slot}
      data-slot-state="filled"
    >
      {onClear && (
        <button
          type="button"
          onClick={() => onClear(slot)}
          aria-label={`Limpar ${label}`}
          className="absolute right-2 top-2 hidden size-5 items-center justify-center rounded-full bg-black/60 text-xs text-white transition-opacity duration-150 ease-out group-hover:flex"
        >
          ×
        </button>
      )}
      <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onRequestItemPick(slot)}
        aria-label={`Alterar ${label}`}
        className="flex flex-col gap-2 rounded-md text-left transition-opacity duration-150 ease-out hover:opacity-90"
      >
        <div className="relative flex size-24 items-center justify-center">
          <ItemIcon
            itemId={item.itemId}
            alt={itemName ?? item.itemId}
            size="xl"
            category={SLOT_CATEGORY[slot] ?? "weapon"}
          />
          {item.tier > 0 && (
            <span
              className="absolute bottom-0 left-0 rounded px-1 text-[10px] font-bold text-[#0b0d11]"
              style={{ backgroundColor: tierColor, lineHeight: "16px" }}
            >
              T{item.tier}
            </span>
          )}
          {item.enchant > 0 && (
            <span
              data-testid="enchant-badge"
              className="absolute bottom-0 right-0 rounded px-1 text-[10px] font-bold text-white"
              style={{ backgroundColor: "var(--color-enchant)", lineHeight: "16px" }}
            >
              .{item.enchant}
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-[13px] font-medium" title={itemName ?? item.itemId}>
          {itemName ?? item.itemId}
        </p>
      </button>
      {((tierOptions.length > 0 && onTierChange) || (enchantOptions.length > 1 && onEnchantChange)) && (
        <div className="flex flex-wrap items-center gap-2" data-testid="tier-enchant-selectors">
          {tierOptions.length > 0 && onTierChange && (
            <TierSelect
              slotLabel={label}
              tier={item.tier}
              options={tierOptions}
              onChange={(option) => onTierChange(slot, option)}
            />
          )}
          {enchantOptions.length > 1 && onEnchantChange && (
            <EnchantSelect
              slotLabel={label}
              enchant={item.enchant}
              options={enchantOptions}
              onChange={(enchant) => onEnchantChange(slot, enchant)}
            />
          )}
        </div>
      )}
      {onSpellChange && (
        <SpellPicker
          itemName={itemName ?? item.itemId}
          selected={item.spells}
          candidatesByGroup={spellCandidatesByGroup}
          onSelect={(group, spellId) => onSpellChange(slot, group, spellId)}
        />
      )}
    </div>
  );
}
