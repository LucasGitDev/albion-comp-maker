"use client";

import { SpellIcon, type SpellSlotLabel } from "@/components/icons/SpellIcon";
import type { Locale } from "@/lib/i18n/locales";
import { t, tf } from "@/lib/i18n/messages";
import type { SpellGroup } from "@/types/build";
import type { SpellCandidate } from "./spell-groups";

const GROUP_ORDER: readonly { group: SpellGroup; label: SpellSlotLabel }[] = [
  { group: "q", label: "Q" },
  { group: "w", label: "W" },
  { group: "e", label: "E" },
  { group: "passive", label: "Passive" },
];

export type SpellPickerProps = {
  locale: Locale;
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
  locale,
  itemName,
  selected,
  candidatesByGroup,
  onSelect,
}: SpellPickerProps): React.JSX.Element | null {
  // ACM-089: a weapon's E is auto-selected by the caller (see
  // computeAutoSelections/SlotCard) whenever it has exactly one candidate,
  // and its row is never rendered — a picker offering exactly one option is
  // redundant. Every other group still renders as soon as it has 1+
  // candidates (unchanged behavior).
  const rows = GROUP_ORDER.filter(({ group }) => {
    const count = candidatesByGroup[group]?.length ?? 0;
    if (count === 0) return false;
    if (group === "e" && count === 1) return false;
    return true;
  });
  const hasAnyCandidates = GROUP_ORDER.some(({ group }) => (candidatesByGroup[group]?.length ?? 0) > 0);

  if (!hasAnyCandidates) {
    return (
      <p
        className="truncate whitespace-nowrap text-[12px] text-icon-muted"
        title={t(locale, "spellPicker.noAbilitiesTitle")}
        data-testid="spell-picker-empty"
      >
        {t(locale, "spellPicker.noAbilities")}
      </p>
    );
  }

  // The item's only candidates are its auto-selected single E (ACM-089) —
  // nothing left for the user to choose, so no row and no "empty" message
  // either (the item genuinely has an ability, just no picker needed).
  if (rows.length === 0) {
    return null;
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
                  aria-label={tf(locale, "spellPicker.ariaLabel", {
                    group: label,
                    item: itemName,
                    spell: candidate.name,
                  })}
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
