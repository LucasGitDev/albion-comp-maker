import type { Locale } from "@/lib/i18n/locales";

/**
 * Deliberately minimal dictionary (decision-026): only the global chrome
 * (nav, account menu, skip link, locale toggle labels). Everything else —
 * editor body, `SLOT_LABELS`, `SwapsSection`, `ThemePanel`, `metadata` —
 * stays PT-BR hardcoded, out of scope for this task. No i18n library: ~10
 * static strings don't justify one, and the feature those libraries exist
 * for (locale routing) was already rejected in ACM-023.
 */
export type MessageKey =
  | "nav.myComps"
  | "nav.share"
  | "account.signIn"
  | "account.fallbackLabel"
  | "account.newBuild"
  | "account.newBuildAriaLabel"
  | "account.openNav"
  | "a11y.skipToContent"
  | "locale.toggleLabel"
  | "locale.en"
  | "locale.pt";

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
  "en-US": {
    "nav.myComps": "My comps",
    "nav.share": "Share",
    "account.signIn": "Sign in",
    "account.fallbackLabel": "Account",
    "account.newBuild": "New build",
    "account.newBuildAriaLabel": "New build",
    "account.openNav": "Open navigation",
    "a11y.skipToContent": "Skip to content",
    "locale.toggleLabel": "Language",
    "locale.en": "EN",
    "locale.pt": "PT",
  },
  "pt-BR": {
    "nav.myComps": "Minhas comps",
    "nav.share": "Compartilhar",
    "account.signIn": "Entrar",
    "account.fallbackLabel": "Conta",
    "account.newBuild": "Nova build",
    "account.newBuildAriaLabel": "Nova build",
    "account.openNav": "Abrir navegação",
    "a11y.skipToContent": "Pular para o conteúdo",
    "locale.toggleLabel": "Idioma",
    "locale.en": "EN",
    "locale.pt": "PT",
  },
};

export function t(locale: Locale, key: MessageKey): string {
  return MESSAGES[locale][key];
}
