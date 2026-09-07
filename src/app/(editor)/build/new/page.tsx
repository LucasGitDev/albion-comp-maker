"use client";

import { useCallback } from "react";
import type { Slot } from "@/data/ao-data";
import { BuildHeader } from "@/components/editor/BuildHeader";
import { SlotGrid } from "@/components/editor/SlotGrid";
import { selectActions, selectBuild, useBuildStore } from "@/store/build-store";

/**
 * Owns the only store subscription in the editor tree. Slot cards and the
 * header receive plain props; they never import the store directly.
 */
export default function NewBuildPage(): React.JSX.Element {
  const build = useBuildStore(selectBuild);
  const actions = useBuildStore(selectActions);

  const handleRequestItemPick = useCallback((slot: Slot) => {
    // ACM-008 delivers the ItemPicker; wiring it to open here is a follow-up
    // task. This is a deliberate no-op placeholder per ACM-011 scope.
    void slot;
  }, []);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <BuildHeader build={build} onNameChange={actions.setName} onRoleChange={actions.setRole} />
      <SlotGrid
        build={build}
        onRequestItemPick={handleRequestItemPick}
        onClearSlot={actions.clearSlot}
        onTierChange={(slot, option) => actions.setTier(slot, option.tier, option.itemId)}
        onSpellChange={actions.setSpell}
      />
    </main>
  );
}
