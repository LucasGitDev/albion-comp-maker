"use client";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { t } from "@/lib/i18n/messages";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Two explicit buttons, not a `<select>` — there are only ever two values
 * (decision-026), and a click target reads better than opening a dropdown
 * for a binary choice.
 */
export function LocaleToggle(): React.JSX.Element {
  const { locale, setLocale } = useLocaleContext();

  function renderOption(value: Locale, label: string): React.JSX.Element {
    const active = locale === value;
    return (
      <button
        type="button"
        aria-pressed={active}
        onClick={() => setLocale(value)}
        className={[
          "rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:transition-none",
          active
            ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
            : "text-foreground/70 hover:text-foreground",
        ].join(" ")}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label={t(locale, "locale.toggleLabel")}
      className="flex items-center gap-0.5 rounded-full border border-[var(--color-border)] p-0.5"
    >
      {renderOption("en-US", t(locale, "locale.en"))}
      {renderOption("pt-BR", t(locale, "locale.pt"))}
    </div>
  );
}
