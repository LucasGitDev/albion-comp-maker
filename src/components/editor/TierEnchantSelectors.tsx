"use client";

import type { Locale } from "@/lib/i18n/locales";
import { t, tf } from "@/lib/i18n/messages";
import type { EnchantOption, TierOption } from "./tier-enchant";

export type TierSelectProps = {
  slotLabel: string;
  locale: Locale;
  tier: number;
  options: readonly TierOption[];
  onChange: (option: TierOption) => void;
};

export function TierSelect({ slotLabel, locale, tier, options, onChange }: TierSelectProps): React.JSX.Element {
  return (
    <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
      {t(locale, "tierEnchant.tier")}
      <select
        aria-label={tf(locale, "tierEnchant.ariaTier", { slot: slotLabel })}
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
  locale: Locale;
  enchant: EnchantOption;
  options: readonly EnchantOption[];
  onChange: (enchant: EnchantOption) => void;
};

/**
 * Renders only when `options` has more than a single level — the caller
 * (`SlotCard`) is expected to gate on `maxEnchant > 0` (ACM-031 AC#2), but
 * this component also degrades gracefully if handed a single-option list.
 */
export function EnchantSelect({
  slotLabel,
  locale,
  enchant,
  options,
  onChange,
}: EnchantSelectProps): React.JSX.Element | null {
  if (options.length <= 1) return null;

  return (
    <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.04em] text-icon-muted">
      {t(locale, "tierEnchant.enchant")}
      <select
        aria-label={tf(locale, "tierEnchant.ariaEnchant", { slot: slotLabel })}
        className="rounded border border-icon-slot-empty bg-icon-slot px-1 py-0.5 text-[11px] font-normal normal-case text-white"
        value={enchant}
        onChange={(event) => {
          const nextEnchant = Number(event.target.value) as EnchantOption;
          if (options.includes(nextEnchant)) onChange(nextEnchant);
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            .{option}
          </option>
        ))}
      </select>
    </label>
  );
}
