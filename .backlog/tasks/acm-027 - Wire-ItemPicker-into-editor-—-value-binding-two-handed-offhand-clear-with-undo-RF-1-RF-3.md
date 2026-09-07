---
id: ACM-027
title: >-
  Wire ItemPicker into editor — value binding, two-handed offhand clear with
  undo (RF-1/RF-3)
status: To Do
assignee: []
created_date: '2026-09-07 17:03'
updated_date: '2026-09-07 17:03'
labels: []
milestone: m-2
dependencies:
  - ACM-028
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Editor-side integration wrapper around the ItemPicker shipped in ACM-008. ACM-008 deliberately does not implement doc-002 §1/§4 state-owning concerns (trigger value/onChange binding, two-handed→offhand clear side effect, undo toast, locked/lockedReason presentation) because they belong to the editor/store layer, out of that task's file scope (see ACM-008 review findings).

Build a wrapper (e.g. `src/components/editor/SlotPicker.tsx` or equivalent) that:
- Opens the ACM-008 `ItemPicker` from a `SlotCard` click, passing `items` from the AOData source used by the editor.
- Binds the picker to `useBuildStore`: current `build.slots[slot]` maps to the picker's notion of the equipped item (for the highlighted/`aria-selected` row, handed to ACM-027-style item-picker work in the sibling task), and `onSelect` calls `actions.setItem(slot, item, tier, enchant)`.
- Implements doc-002 §4: when the selected mainhand item is `twohanded` and the offhand slot is currently filled, clear the offhand (store already supports this via `setItem`), then show an undo toast (8s, bottom-right) offering `[Desfazer]` that restores both slots atomically (mainhand back to previous item/tier/enchant, offhand back to its previous EquippedItem). No toast when the offhand was already empty.
- Presents the offhand `SlotCard` in the existing `locked` visual state (already implemented in `SlotCard.tsx`) whenever `build.slots.mainhand` is `twohanded`, with `lockedReason` text per doc-002 §4 ("Arma de duas mãos ocupa a off-hand" / EN equivalent).
- Unlocks automatically (returns to empty/filled `SlotCard` state) when mainhand changes to a one-handed item or is cleared — this already falls out of `build.slots.mainhand.twohanded` being recomputed from store state; wrapper must not cache a stale locked flag.

Out of scope: cross-locale secondary name display, `<mark>` highlighting, `aria-selected` wiring inside ItemPicker's result rows, and virtualization — tracked in the sibling task "ItemPicker polish — cross-locale names, highlight, aria-selected, virtualization".

File scope: `src/components/editor/**` (new wrapper + `SlotCard`/`SlotGrid` call-site changes), `src/store/build-store.ts` (only if an explicit undo/history action is needed beyond re-calling `setItem` with the previous values — prefer capturing the previous slot values in the wrapper's closure over adding store history, note the chosen approach in implementation notes). Must not modify `src/components/item-picker/**` (owned by the sibling task) beyond consuming its existing public props.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Selecting a two-handed mainhand while the offhand is filled clears the offhand in the store (build.slots.offhand becomes null) and shows an undo toast within the same tick; clicking [Desfazer] restores both the mainhand and offhand slots to their exact prior EquippedItem values
- [ ] #2 Selecting a two-handed mainhand while the offhand is already empty produces no toast (verified by a test asserting the toast/notification is not rendered)
- [ ] #3 The offhand SlotCard renders in the existing locked visual state with a lockedReason tooltip/title whenever build.slots.mainhand.twohanded is true, and returns to empty/filled state automatically when mainhand becomes one-handed or is cleared (covered by a test that flips mainhand between a 2H and a 1H item and asserts the offhand card's data-slot-state)
- [ ] #4 Clicking an empty or filled SlotCard opens the ACM-008 ItemPicker anchored to that slot, and selecting a result calls useBuildStore's setItem with the chosen item/tier/enchant, closing the picker
- [ ] #5 make check passes on the task branch (lint, tsc --noEmit, next build, vitest)
<!-- AC:END -->
