"use client";

import type { EnchantOption, TierOption } from "./tier-enchant";

export type TierSelectProps = {
  slotLabel: string;
  tier: number;
  options: readonly TierOption[];
  onChange: (option: TierOption) => void;
};

export function TierSelect({ slotLabel, tier, options, onChange }: TierSelectProps): React.JSX.Element {
  return (
    <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
      Tier
      <select
        aria-label={`Tier de ${slotLabel}`}
        className="rounded border border-icon-slot-empty bg-icon-slot px-1 py-0.5 text-[11px] font-normal normal-case text-white"
        value={tier}
        onChange={(event) => {
          const nextTier = Number(event.target.value);
          const option = options.find((candidate) => candidate.tier === nextTier);
          if (option) onChange(option);
        }}
      >
        {options.map((option) => (
          <option key={option.tier} value={option.tier}>
            T{option.tier}
          </option>
        ))}
      </select>
    </label>
  );
}

export type EnchantSelectProps = {
  slotLabel: string;
  enchant: number;
  options: readonly EnchantOption[];
  onChange: (option: EnchantOption) => void;
};

export function EnchantSelect({ slotLabel, enchant, options, onChange }: EnchantSelectProps): React.JSX.Element {
  return (
    <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
      Encanto
      <select
        aria-label={`Encanto de ${slotLabel}`}
        className="rounded border border-icon-slot-empty bg-icon-slot px-1 py-0.5 text-[11px] font-normal normal-case text-white"
        value={enchant}
        onChange={(event) => {
          const nextEnchant = Number(event.target.value);
          const option = options.find((candidate) => candidate.enchant === nextEnchant);
          if (option) onChange(option);
        }}
      >
        {options.map((option) => (
          <option key={option.enchant} value={option.enchant}>
            .{option.enchant}
          </option>
        ))}
      </select>
    </label>
  );
}
