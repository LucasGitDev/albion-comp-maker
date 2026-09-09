"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/locales";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export type LocaleProviderProps = {
  /** Seeded server-side (RootLayout reads the cookie) so the very first
   * client render already has the right value — no `useEffect`, no fetch,
   * no flash of the wrong language (decision-026). */
  initialLocale: Locale;
  children: ReactNode;
};

export function LocaleProvider({ initialLocale, children }: LocaleProviderProps): React.JSX.Element {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
      setLocaleState(next);
      router.refresh();
    },
    [router]
  );

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Throws (rather than silently defaulting to EN) when used outside `LocaleProvider`. */
export function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}

export function useLocale(): Locale {
  return useLocaleContext().locale;
}

/**
 * Non-throwing variant, `undefined` outside a `LocaleProvider`. Exists for
 * components (e.g. `ItemPicker`) that accept an explicit `locale` prop
 * overriding the context — their existing test suites render them without
 * wrapping in a provider and always pass `locale` explicitly, so those
 * components must not hard-require a provider the way `useLocale()` does.
 */
export function useOptionalLocale(): Locale | undefined {
  return useContext(LocaleContext)?.locale;
}
