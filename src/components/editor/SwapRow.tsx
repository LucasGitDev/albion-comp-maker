"use client";

import type { Slot } from "@/data/ao-data";
import { ItemIcon } from "@/components/icons/ItemIcon";
import { CategorySilhouette, type IconCategory } from "@/components/icons/category-glyphs";
import { SLOT_ORDER } from "@/types/build";
import type { EquippedItem, Swap, SpellGroup } from "@/types/build";
import { SLOT_LABELS } from "./SlotCard";
import type { SpellCandidate } from "./spell-groups";
import { SpellPicker } from "./SpellPicker";

const SLOT_CATEGORY: Record<Slot, Exclude<IconCategory, "generic">> = {
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

/** Applied on blur when the label is left empty — see `addSwap`/`setSwapLabel` in build-store.ts (ACM-012 review round 2, ACM-060). */
export const DEFAULT_SWAP_LABEL = "Novo swap";

export type SwapRowProps = {
  swap: Swap;
  index: number;
  total: number;
  /** The item currently equipped in the build's own slot matching this swap's slot, for read-only reference. */
  buildItemForSlot: EquippedItem | null;
  buildItemName?: string;
  swapItemName?: string;
  spellCandidatesByGroup?: Partial<Record<SpellGroup, readonly SpellCandidate[]>>;
  onSlotChange: (slot: Slot) => void;
  onRequestItemPick: () => void;
  onLabelChange: (label: string) => void;
  onSpellChange: (group: SpellGroup, spellId: string | null) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  /**
   * Exposes the row's "Remover" button node so `SwapsSection` can move
   * focus to it (or to a sibling row's) after a removal — a `<body>`
   * focus target after every removal was ACM-012 review round 2's HIGH
   * a11y finding.
   */
  removeButtonRef?: (element: HTMLButtonElement | null) => void;
};

/**
 * One row of the Swaps section (ACM-012, RF-3): `slot → current item →
 * alternative item`, with an inline-editable label and up/down reorder
 * buttons. Reorder uses buttons, not drag — see ACM-012 implementation
 * notes: swap lists are 1-20 items, buttons are keyboard-accessible for
 * free and don't add a drag-and-drop dependency to a route that already
 * ships html2canvas.
 */
export function SwapRow({
  swap,
  index,
  total,
  buildItemForSlot,
  buildItemName,
  swapItemName,
  spellCandidatesByGroup = {},
  onSlotChange,
  onRequestItemPick,
  onLabelChange,
  onSpellChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  removeButtonRef,
}: SwapRowProps): React.JSX.Element {
  const slot = (Object.keys(swap.slots)[0] as Slot | undefined) ?? "mainhand";
  const swapItem = swap.slots[slot] ?? null;
  const category = SLOT_CATEGORY[slot] ?? "weapon";

  return (
    <li
      className="flex flex-col gap-3 rounded-xl border border-icon-slot-empty bg-icon-slot p-3"
      data-testid="swap-row"
      data-swap-id={swap.id}
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-icon-muted">Slot</span>
          <select
            aria-label={`Slot do swap ${index + 1}`}
            value={slot}
            onChange={(event) => onSlotChange(event.target.value as Slot)}
            className="rounded-md border border-icon-slot-empty bg-icon-placeholder px-2 py-1 text-[13px]"
          >
            {SLOT_ORDER.map((option) => (
              <option key={option} value={option}>
                {SLOT_LABELS[option]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] uppercase tracking-[0.04em] text-icon-muted">Atual</span>
            {buildItemForSlot ? (
              <ItemIcon
                itemId={buildItemForSlot.itemId}
                alt={buildItemName ?? buildItemForSlot.itemId}
                size="sm"
                category={category}
              />
            ) : (
              <span
                className="flex size-8 items-center justify-center rounded-md bg-icon-placeholder opacity-40"
                aria-label="Slot vazio no build principal"
              >
                <CategorySilhouette category={category} size={16} />
              </span>
            )}
          </div>

          <span aria-hidden="true" className="text-icon-muted">
            →
          </span>

          <button
            type="button"
            onClick={onRequestItemPick}
            aria-label={`Escolher item alternativo para ${SLOT_LABELS[slot]}`}
            className="flex flex-col items-center gap-1 rounded-md p-1 transition-opacity duration-150 ease-out hover:opacity-90"
          >
            <span className="text-[11px] uppercase tracking-[0.04em] text-icon-muted">Alternativo</span>
            {swapItem ? (
              <ItemIcon itemId={swapItem.itemId} alt={swapItemName ?? swapItem.itemId} size="sm" category={category} />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-md border border-dashed border-icon-slot-empty bg-icon-placeholder opacity-60">
                <CategorySilhouette category={category} size={16} />
              </span>
            )}
          </button>

          {swapItem && (
            <p className="line-clamp-1 max-w-[160px] text-[13px] font-medium" title={swapItemName ?? swapItem.itemId}>
              {swapItemName ?? swapItem.itemId}
            </p>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={`Mover swap ${index + 1} para cima`}
            className="flex size-7 items-center justify-center rounded-md border border-icon-slot-empty text-icon-muted transition-colors duration-150 ease-out hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label={`Mover swap ${index + 1} para baixo`}
            className="flex size-7 items-center justify-center rounded-md border border-icon-slot-empty text-icon-muted transition-colors duration-150 ease-out hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          >
            ↓
          </button>
          <button
            ref={removeButtonRef}
            type="button"
            onClick={onRemove}
            aria-label={`Remover swap ${index + 1}`}
            className="flex size-7 items-center justify-center rounded-md border border-icon-slot-empty text-icon-muted transition-colors duration-150 ease-out hover:text-icon-error-fg"
          >
            ×
          </button>
        </div>
      </div>

      <input
        type="text"
        value={swap.label}
        onChange={(event) => onLabelChange(event.target.value)}
        onBlur={() => {
          // swapSchema.label is min(1) (ACM-049): a swap can never persist
          // an empty label. Substituting the default here — instead of
          // pre-filling it at creation — keeps the real placeholder
          // ("Quando usar? ...") visible until the leader actually leaves
          // the field empty (ACM-012 review round 2).
          if (swap.label.trim() === "") onLabelChange(DEFAULT_SWAP_LABEL);
        }}
        placeholder="Quando usar? ex.: fights de bridge"
        aria-label={`Rótulo do swap ${index + 1}`}
        maxLength={60}
        className="rounded-md border border-transparent bg-transparent px-1 py-1 text-[13px] transition-colors duration-150 ease-out focus:border-icon-slot-empty focus:outline-none"
      />

      {!buildItemForSlot && (
        <p className="text-[12px] text-icon-muted">
          Este slot está vazio no build principal. O swap será exibido como item avulso.
        </p>
      )}

      {swapItem && (
        <SpellPicker
          itemName={swapItemName ?? swapItem.itemId}
          selected={swapItem.spells}
          candidatesByGroup={spellCandidatesByGroup}
          onSelect={onSpellChange}
        />
      )}
    </li>
  );
}
