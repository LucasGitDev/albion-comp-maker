"use client";

import { useEffect, useRef, useState } from "react";
import type { Slot } from "@/data/ao-data";
import type { EquippedItem, Swap, SpellGroup } from "@/types/build";
import { SwapRow } from "./SwapRow";
import type { SpellCandidate } from "./spell-groups";
import { useOptionalLocale } from "@/components/i18n/LocaleProvider";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { t } from "@/lib/i18n/messages";

/**
 * UI-level soft cap (ACM-012 review round 2), distinct from the store's
 * `MAX_SWAPS` (20) hard cap mirroring `swapSchema`'s persisted bound
 * (`src/store/build-store.ts`, ACM-049). The two are deliberately separate:
 * `MAX_SWAPS` is a data-integrity bound the write schema enforces
 * regardless of UI; `SWAP_SOFT_CAP` is the UX-spec's product decision
 * ("o card fica ilegível no Discord" — the swaps section alone is ~2700px
 * tall at 20 rows). Blocking creation here at 8, not 20, is the fix; a
 * previous round used `MAX_SWAPS` for both and lost the legibility
 * rationale.
 */
export const SWAP_SOFT_CAP = 8;

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
  const locale = useOptionalLocale() ?? DEFAULT_LOCALE;
  const atSoftCap = swaps.length >= SWAP_SOFT_CAP;
  const softCapHintId = "swaps-soft-cap-hint";

  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const removeButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocusIndex = useRef<number | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  // Runs after every render where a removal was requested: `swaps` here is
  // always the post-removal list, since the store update and this
  // component's re-render are driven by the same parent subscription
  // (ACM-012 review round 2, HIGH — focus was previously lost to <body>).
  useEffect(() => {
    if (pendingFocusIndex.current === null) return;
    const requestedIndex = pendingFocusIndex.current;
    pendingFocusIndex.current = null;

    if (swaps.length === 0) {
      addButtonRef.current?.focus();
      return;
    }
    // Clamping to the last valid index covers both cases the spec calls
    // out: removing a middle/first row moves focus to the row that slid
    // into its place; removing the last row clamps back to the new last
    // row (the previous one).
    const targetIndex = Math.min(requestedIndex, swaps.length - 1);
    const targetId = swaps[targetIndex]?.id;
    if (targetId) removeButtonRefs.current.get(targetId)?.focus();
  }, [swaps]);

  const handleRemove = (id: string, index: number) => {
    pendingFocusIndex.current = index;
    onRemoveSwap(id);
  };

  const handleMove = (id: string, direction: "up" | "down", index: number) => {
    onMoveSwap(id, direction);
    const newPosition = direction === "up" ? index : index + 2;
    setLiveMessage(`Swap movido para posição ${newPosition} de ${swaps.length}`);
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby="swaps-heading">
      <div className="flex items-center justify-between">
        <h2 id="swaps-heading" className="text-[13px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
          {t(locale, "editor.swaps")} · {swaps.length}
        </h2>
        <button
          ref={addButtonRef}
          type="button"
          onClick={onAddSwap}
          disabled={atSoftCap}
          aria-describedby={atSoftCap ? softCapHintId : undefined}
          className="rounded-md border border-icon-slot-empty px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors duration-150 ease-out hover:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t(locale, "editor.addSwap")}
        </button>
      </div>

      {atSoftCap && (
        <p id={softCapHintId} className="text-[12px] text-icon-muted">
          Máximo de {SWAP_SOFT_CAP} swaps — o card fica ilegível no Discord.
        </p>
      )}

      {/* Reorder announcements (ACM-012 spec §3); the action bar's own live
          region is a separate concern (save status) and shouldn't double
          up as this one. */}
      <div aria-live="polite" className="sr-only">
        {liveMessage}
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
                onMoveUp={() => handleMove(swap.id, "up", index)}
                onMoveDown={() => handleMove(swap.id, "down", index)}
                onRemove={() => handleRemove(swap.id, index)}
                removeButtonRef={(element) => {
                  if (element) removeButtonRefs.current.set(swap.id, element);
                  else removeButtonRefs.current.delete(swap.id);
                }}
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
