"use client";

import type { Slot } from "@/data/ao-data";
import { ItemIcon } from "@/components/icons/ItemIcon";
import type { EquippedItem, SpellGroup } from "@/types/build";
import type { SpellCandidate } from "./spell-groups";
import { SpellPicker } from "./SpellPicker";
import { TierSelect } from "./TierEnchantSelectors";
import type { TierOption } from "./tier-enchant";

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
  onRequestItemPick: (slot: Slot) => void;
  onClear?: (slot: Slot) => void;
  onTierChange?: (slot: Slot, option: TierOption) => void;
  onSpellChange?: (slot: Slot, group: SpellGroup, spellId: string | null) => void;
};

type SlotCategory = "weapon" | "armor" | "utility" | "consumable";

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

const CATEGORY_GLYPH: Record<SlotCategory, React.JSX.Element> = {
  weapon: (
    <path
      d="M6 18 18 6M14 4l6 6-2 2-6-6zM4 20l3-1 1-3"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  armor: (
    <path
      d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  utility: (
    <path
      d="M4 8h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8zM8 8V6a4 4 0 0 1 8 0v2"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
  consumable: (
    <path
      d="M9 3h6v3l2 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l2-3V3z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  ),
};

/**
 * Neutral per-category silhouette for empty slots (ACM-035). Deliberately
 * never renders `ItemIcon`: an empty slot has no `itemId`, and `ItemIcon`
 * treats an empty id as an invalid one, forcing the error glyph/red ring —
 * the exact bug this task fixes. The slot's own label already names it, so
 * this glyph stays `aria-hidden`.
 */
function SlotPlaceholderIcon({ category }: { category: SlotCategory }): React.JSX.Element {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      data-slot-placeholder={category}
      className="text-icon-muted"
    >
      {CATEGORY_GLYPH[category]}
    </svg>
  );
}

export function SlotCard({
  slot,
  item,
  itemName,
  spellCandidatesByGroup = {},
  locked = false,
  tierOptions = [],
  onRequestItemPick,
  onClear,
  onTierChange,
  onSpellChange,
}: SlotCardProps): React.JSX.Element {
  const label = SLOT_LABELS[slot] ?? slot;
  const tierColor = item && item.tier > 0 ? (TIER_COLOR_VAR[item.tier] ?? "var(--color-tier-low)") : undefined;

  if (locked) {
    return (
      <div
        className="flex w-[168px] cursor-not-allowed flex-col gap-2 rounded-xl border border-icon-slot-empty bg-icon-slot p-3 opacity-60"
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
        className="flex w-[168px] flex-col gap-2 rounded-xl border border-dashed border-icon-slot-empty bg-icon-slot p-3 text-left transition-colors duration-150 ease-out hover:border-solid hover:border-[var(--color-enchant)]"
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
      className="group relative flex w-[168px] flex-col gap-2 rounded-xl border border-icon-slot-empty bg-icon-slot p-3"
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
          <ItemIcon itemId={item.itemId} alt={itemName ?? item.itemId} size="xl" />
          {item.tier > 0 && (
            <span
              className="absolute bottom-0 left-0 rounded px-1 text-[10px] font-bold text-[#0b0d11]"
              style={{ backgroundColor: tierColor, lineHeight: "16px" }}
            >
              T{item.tier}
            </span>
          )}
          {/*
            Enchant badge intentionally omitted until ACM-030 lands
            `AOItem.maxEnchant`: `item.enchant` is always 0 for real data today
            (see decision-011), so there is nothing genuine to display yet.
          */}
        </div>
        <p className="line-clamp-2 text-[13px] font-medium" title={itemName ?? item.itemId}>
          {itemName ?? item.itemId}
        </p>
      </button>
      {tierOptions.length > 0 && onTierChange && (
        <div className="flex flex-wrap items-center gap-2" data-testid="tier-enchant-selectors">
          <TierSelect
            slotLabel={label}
            tier={item.tier}
            options={tierOptions}
            onChange={(option) => onTierChange(slot, option)}
          />
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
