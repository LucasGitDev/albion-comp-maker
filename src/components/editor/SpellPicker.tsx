"use client";

import { SpellIcon, type SpellSlotLabel } from "@/components/icons/SpellIcon";
import type { SpellGroup } from "@/types/build";
import type { SpellCandidate } from "./spell-groups";

const GROUP_ORDER: readonly { group: SpellGroup; label: SpellSlotLabel }[] = [
  { group: "q", label: "Q" },
  { group: "w", label: "W" },
  { group: "e", label: "E" },
  { group: "passive", label: "Passive" },
];

export type SpellPickerProps = {
  itemName: string;
  /** Selected spell uniquename per group (null when nothing picked yet). */
  selected: Record<SpellGroup, string | null>;
  /**
   * Candidate spells the equipped item actually exposes, keyed by group.
   * A group absent here renders no row at all — the product only ever
   * offers abilities the item genuinely has.
   */
  candidatesByGroup: Partial<Record<SpellGroup, readonly SpellCandidate[]>>;
  onSelect: (group: SpellGroup, spellId: string | null) => void;
};

/** Interactive chip row per spell group: only abilities the item's own resolved spell list exposes are ever offered. */
export function SpellPicker({
  itemName,
  selected,
  candidatesByGroup,
  onSelect,
}: SpellPickerProps): React.JSX.Element | null {
  const rows = GROUP_ORDER.filter(({ group }) => (candidatesByGroup[group]?.length ?? 0) > 0);
  if (rows.length === 0) {
    return (
      <p className="text-[12px] text-icon-muted" data-testid="spell-picker-empty">
        Este item não possui abilities.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="spell-picker">
      {rows.map(({ group, label }) => {
        const candidates = candidatesByGroup[group] ?? [];
        const selectedId = selected[group];
        return (
          <div key={group} className="flex flex-wrap items-center gap-1" data-testid={`spell-group-${group}`}>
            {candidates.map((candidate) => {
              const isSelected = candidate.uniquename === selectedId;
              return (
                <button
                  key={candidate.uniquename}
                  type="button"
                  title={candidate.name}
                  aria-pressed={isSelected}
                  aria-label={`${label} de ${itemName}: ${candidate.name}`}
                  onClick={() => onSelect(group, isSelected ? null : candidate.uniquename)}
                  className={`rounded-md transition-[filter,opacity] duration-150 ease-out ${
                    isSelected ? "opacity-100" : "grayscale opacity-60 hover:opacity-90"
                  }`}
                >
                  <SpellIcon
                    sprite={candidate.uniquename}
                    alt={candidate.name}
                    size="sm"
                    slotLabel={label}
                    decorative
                  />
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
