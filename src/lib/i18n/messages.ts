import type { Locale } from "@/lib/i18n/locales";

/**
 * ACM-101 extends the ACM-093/decision-026 dictionary beyond the global
 * chrome into the hero, home empty states, and the `/build/new` editor
 * surface (`SLOT_LABELS`, `SwapsSection` headers, `ThemePanel`, breadcrumbs,
 * `metadata`). Deep per-row strings inside `SwapRow`/`TierEnchantSelectors`/
 * `SpellPicker` (aria-labels built from dynamic item/slot names) remain
 * PT-BR hardcoded — those are enumerable-value labels, not the kind of
 * static copy this dictionary shape suits, and are tracked as a follow-up.
 * No i18n library: the feature those libraries exist for (locale routing)
 * was already rejected in ACM-023.
 */
export type MessageKey =
  | "nav.myComps"
  | "nav.myBuilds"
  | "account.signIn"
  | "account.fallbackLabel"
  | "account.newComp"
  | "account.newCompAriaLabel"
  | "account.openNav"
  | "a11y.skipToContent"
  | "locale.toggleLabel"
  | "locale.en"
  | "locale.pt"
  | "guestCta.message"
  | "guestCta.signIn"
  | "metadata.title"
  | "metadata.description"
  | "home.heroTitle"
  | "home.heroSubtitle"
  | "home.signInWithDiscord"
  | "home.myComps"
  | "home.newBuild"
  | "home.newComp"
  | "home.emptyTitle"
  | "home.emptySubtitle"
  | "home.emptyCta"
  | "empty.noComps"
  | "empty.noCompsSubtitle"
  | "empty.createFirstComp"
  | "empty.noBuilds"
  | "empty.noBuildsSubtitle"
  | "empty.createFirstBuild"
  | "editor.breadcrumbMyComps"
  | "editor.newBuild"
  | "editor.buildDetails"
  | "editor.buildNameLabel"
  | "editor.buildNamePlaceholder"
  | "editor.roleLabel"
  | "editor.rolePlaceholder"
  | "editor.save"
  | "editor.saving"
  | "editor.exportPng"
  | "editor.exporting"
  | "editor.appearance"
  | "editor.addSwap"
  | "editor.swaps"
  | "slot.mainhand"
  | "slot.offhand"
  | "slot.head"
  | "slot.armor"
  | "slot.shoes"
  | "slot.cape"
  | "slot.bag"
  | "slot.mount"
  | "slot.food"
  | "slot.potion"
  | "slot.add"
  | "slot.lockedByTwoHanded"
  | "theme.title"
  | "theme.preset"
  | "theme.background"
  | "theme.colorsAndTypography"
  | "theme.contentAndFormat";

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = {
  "en-US": {
    "nav.myComps": "My comps",
    "nav.myBuilds": "My builds",
    "account.signIn": "Sign in",
    "account.fallbackLabel": "Account",
    "account.newComp": "New comp",
    "account.newCompAriaLabel": "New comp",
    "account.openNav": "Open navigation",
    "a11y.skipToContent": "Skip to content",
    "locale.toggleLabel": "Language",
    "locale.en": "EN",
    "locale.pt": "PT",
    "guestCta.message": "Build your own comp",
    "guestCta.signIn": "Sign in with Discord",
    "metadata.title": "Albion Comp Maker",
    "metadata.description": "Build Albion Online comps and export cards ready for Discord.",
    "home.heroTitle": "Build Albion Online comps ready for Discord",
    "home.heroSubtitle":
      "Pick builds, gear, and each item's real abilities, then export a PNG card to share with your guild in seconds.",
    "home.signInWithDiscord": "Sign in with Discord",
    "home.myComps": "My comps",
    "home.newBuild": "New build",
    "home.newComp": "New comp",
    "home.emptyTitle": "Your first comp",
    "home.emptySubtitle": "Put together your guild's composition and export a PNG ready for Discord.",
    "home.emptyCta": "Create comp",
    "empty.noComps": "No comps yet",
    "empty.noCompsSubtitle": "Create your first comp to get started.",
    "empty.createFirstComp": "Create first comp",
    "empty.noBuilds": "No builds yet",
    "empty.noBuildsSubtitle": "Create your first build to get started.",
    "empty.createFirstBuild": "Create build",
    "editor.breadcrumbMyComps": "← My comps",
    "editor.newBuild": "New build",
    "editor.buildDetails": "Build details",
    "editor.buildNameLabel": "Build name",
    "editor.buildNamePlaceholder": "Frontline bruiser",
    "editor.roleLabel": "Role",
    "editor.rolePlaceholder": "Tank",
    "editor.save": "Save",
    "editor.saving": "Saving…",
    "editor.exportPng": "Export PNG",
    "editor.exporting": "Exporting…",
    "editor.appearance": "Appearance",
    "editor.addSwap": "+ Add swap",
    "editor.swaps": "Swaps",
    "slot.mainhand": "Main hand",
    "slot.offhand": "Off hand",
    "slot.head": "Head",
    "slot.armor": "Chest",
    "slot.shoes": "Boots",
    "slot.cape": "Cape",
    "slot.bag": "Bag",
    "slot.mount": "Mount",
    "slot.food": "Food",
    "slot.potion": "Potion",
    "slot.add": "Add",
    "slot.lockedByTwoHanded": "Occupied by a two-handed weapon",
    "theme.title": "Appearance",
    "theme.preset": "Preset",
    "theme.background": "Background",
    "theme.colorsAndTypography": "Colors and typography",
    "theme.contentAndFormat": "Content and format",
  },
  "pt-BR": {
    "nav.myComps": "Minhas comps",
    "nav.myBuilds": "Minhas builds",
    "account.signIn": "Entrar",
    "account.fallbackLabel": "Conta",
    "account.newComp": "Nova comp",
    "account.newCompAriaLabel": "Nova comp",
    "account.openNav": "Abrir navegação",
    "a11y.skipToContent": "Pular para o conteúdo",
    "locale.toggleLabel": "Idioma",
    "locale.en": "EN",
    "locale.pt": "PT",
    "guestCta.message": "Monte sua própria comp",
    "guestCta.signIn": "Entrar com Discord",
    "metadata.title": "Albion Comp Maker",
    "metadata.description": "Monte comps de Albion Online e exporte cards prontos para o Discord.",
    "home.heroTitle": "Monte comps de Albion Online prontas para o Discord",
    "home.heroSubtitle":
      "Escolha builds, equipamentos e habilidades reais de cada item, e exporte um card em PNG para compartilhar com sua guilda em segundos.",
    "home.signInWithDiscord": "Entrar com Discord",
    "home.myComps": "Minhas comps",
    "home.newBuild": "Nova build",
    "home.newComp": "Nova comp",
    "home.emptyTitle": "Sua primeira comp",
    "home.emptySubtitle": "Monte a composição da sua guilda e exporte o PNG pronto pro Discord.",
    "home.emptyCta": "Criar comp",
    "empty.noComps": "Nenhuma comp ainda",
    "empty.noCompsSubtitle": "Crie sua primeira comp para começar.",
    "empty.createFirstComp": "Criar primeira comp",
    "empty.noBuilds": "Nenhuma build ainda",
    "empty.noBuildsSubtitle": "Crie sua primeira build para começar.",
    "empty.createFirstBuild": "Criar build",
    "editor.breadcrumbMyComps": "← Minhas comps",
    "editor.newBuild": "Nova build",
    "editor.buildDetails": "Detalhes da build",
    "editor.buildNameLabel": "Nome do build",
    "editor.buildNamePlaceholder": "Bruiser de frontline",
    "editor.roleLabel": "Papel",
    "editor.rolePlaceholder": "Tank",
    "editor.save": "Salvar",
    "editor.saving": "Salvando…",
    "editor.exportPng": "Exportar PNG",
    "editor.exporting": "Exportando…",
    "editor.appearance": "Aparência",
    "editor.addSwap": "+ Adicionar swap",
    "editor.swaps": "Swaps",
    "slot.mainhand": "Mão principal",
    "slot.offhand": "Mão secundária",
    "slot.head": "Cabeça",
    "slot.armor": "Peito",
    "slot.shoes": "Botas",
    "slot.cape": "Capa",
    "slot.bag": "Bolsa",
    "slot.mount": "Montaria",
    "slot.food": "Comida",
    "slot.potion": "Poção",
    "slot.add": "Adicionar",
    "slot.lockedByTwoHanded": "Ocupada por arma de duas mãos",
    "theme.title": "Aparência",
    "theme.preset": "Preset",
    "theme.background": "Fundo",
    "theme.colorsAndTypography": "Cores e tipografia",
    "theme.contentAndFormat": "Conteúdo e formato",
  },
};

export function t(locale: Locale, key: MessageKey): string {
  return MESSAGES[locale][key];
}
