"use client";

import type { Slot } from "@/data/ao-data";
import type { EquippedItem, Swap, SpellGroup } from "@/types/build";
import { MAX_SWAPS } from "@/store/build-store";
import { SwapRow } from "./SwapRow";
import type { SpellCandidate } from "./spell-groups";

export type SwapsSectionProps = {
  swaps: Swap[];
  buildSlots: Record<Slot, EquippedItem | null>;
  itemNames?: Record<string, string>;
  spellCandidatesByItemId?: Record<string, Partial<Record<SpellGroup, readonly SpellCandidate[]>>>;
  onAddSwap: () => void;
  onRemoveSwap: (id: string) => void;
  onMoveSwap: (id: string, direction: "up" | "down") => void;
  onSlotChange: (id: string, slot: Slot) => void;
  onRequestItemPick: (id: string, slot: Slot) => void;
  onLabelChange: (id: string, label: string) => void;
  onSpellChange: (id: string, slot: Slot, group: SpellGroup, spellId: string | null) => void;
};

/**
 * Swaps section (ACM-012, RF-3): substituições condicionais exibidas
 * imediatamente abaixo da grade de slots, sem estado colapsado por padrão.
 * Dono do estado vazio, do header com contagem e do botão de adicionar —
 * cada linha é um `SwapRow`.
 */
export function SwapsSection({
  swaps,
  buildSlots,
  itemNames = {},
  spellCandidatesByItemId = {},
  onAddSwap,
  onRemoveSwap,
  onMoveSwap,
  onSlotChange,
  onRequestItemPick,
  onLabelChange,
  onSpellChange,
}: SwapsSectionProps): React.JSX.Element {
  const atCap = swaps.length >= MAX_SWAPS;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="swaps-heading">
      <div className="flex items-center justify-between">
        <h2 id="swaps-heading" className="text-[13px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
          Swaps · {swaps.length}
        </h2>
        <button
          type="button"
          onClick={onAddSwap}
          disabled={atCap}
          title={atCap ? `Máximo de ${MAX_SWAPS} swaps` : undefined}
          className="rounded-md border border-icon-slot-empty px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors duration-150 ease-out hover:border-[var(--color-enchant)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Adicionar swap
        </button>
      </div>

      {swaps.length === 0 ? (
        <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-icon-slot-empty p-6 text-center">
          <p className="text-[14px] font-semibold">Nenhum swap definido</p>
          <p className="max-w-[420px] text-[13px] text-icon-muted">
            Liste trocas obrigatórias para o grupo — ex.: &quot;T8 Martelo → T8 Machado em fights de bridge&quot;.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {swaps.map((swap, index) => {
            const slot = (Object.keys(swap.slots)[0] as Slot | undefined) ?? "mainhand";
            const swapItem = swap.slots[slot] ?? null;
            return (
              <SwapRow
                key={swap.id}
                swap={swap}
                index={index}
                total={swaps.length}
                buildItemForSlot={buildSlots[slot] ?? null}
                buildItemName={buildSlots[slot] ? itemNames[buildSlots[slot]!.itemId] : undefined}
                swapItemName={swapItem ? itemNames[swapItem.itemId] : undefined}
                spellCandidatesByGroup={swapItem ? spellCandidatesByItemId[swapItem.itemId] : undefined}
                onSlotChange={(nextSlot) => onSlotChange(swap.id, nextSlot)}
                onRequestItemPick={() => onRequestItemPick(swap.id, slot)}
                onLabelChange={(label) => onLabelChange(swap.id, label)}
                onSpellChange={(group, spellId) => onSpellChange(swap.id, slot, group, spellId)}
                onMoveUp={() => onMoveSwap(swap.id, "up")}
                onMoveDown={() => onMoveSwap(swap.id, "down")}
                onRemove={() => onRemoveSwap(swap.id)}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
