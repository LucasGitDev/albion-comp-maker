import type { Locale } from "@/lib/i18n/locales";

/**
 * ACM-101 extends the ACM-093/decision-026 dictionary beyond the global
 * chrome into the hero, home empty states, and the `/build/new` editor
 * surface (`SLOT_LABELS`, `SwapsSection` headers, `ThemePanel`, breadcrumbs,
 * `metadata`). ACM-120 closes the follow-up it left open: the deep per-row
 * strings inside `SwapRow`/`TierEnchantSelectors`/`SpellPicker`
 * (aria-labels built from dynamic item/slot names, via `tf`) and
 * `EditorActionBar`'s `KNOWN_SAVE_ERROR_MESSAGES`/`ThemePanel` upload
 * errors are now translated too.
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
  | "theme.contentAndFormat"
  | "theme.announcePresetChanged"
  | "theme.announceBackgroundApplied"
  | "theme.announceBackgroundRemoved"
  | "swap.slot"
  | "swap.current"
  | "swap.alternative"
  | "swap.emptySlotAlt"
  | "swap.emptySlotNote"
  | "swap.labelPlaceholder"
  | "swap.defaultLabel"
  | "swap.ariaSlot"
  | "swap.ariaPickAlternative"
  | "swap.ariaMoveUp"
  | "swap.ariaMoveDown"
  | "swap.ariaRemove"
  | "swap.ariaLabelInput"
  | "tierEnchant.tier"
  | "tierEnchant.enchant"
  | "tierEnchant.ariaTier"
  | "tierEnchant.ariaEnchant"
  | "spellPicker.noAbilities"
  | "spellPicker.noAbilitiesTitle"
  | "spellPicker.ariaLabel"
  | "editorAction.errorUnauthorized"
  | "editorAction.errorTooManyRequests"
  | "editorAction.errorBuildNotFound"
  | "editorAction.errorInvalidBackground"
  | "editorAction.errorBuildTooLarge"
  | "editorAction.errorThemeTooLarge"
  | "editorAction.errorInvalidSource"
  | "editorAction.errorGeneric"
  | "editorAction.tryAgain"
  | "editorAction.saved"
  | "editorAction.nameRequired"
  | "editorAction.needsReadyItem"
  | "editorAction.unsaved"
  | "editorAction.notReadyToExport"
  | "editorAction.exportFailed"
  | "editorAction.signInDialogLabel"
  | "editorAction.signInDialogMessage"
  | "editorAction.notNow"
  | "editorAction.signIn"
  | "theme.uploadUnsupportedFormat"
  | "theme.uploadTooLarge"
  | "theme.uploadFailed";

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
    "theme.announcePresetChanged": "Preset changed to {preset}.",
    "theme.announceBackgroundApplied": "Background image applied.",
    "theme.announceBackgroundRemoved": "Background image removed.",
    "swap.slot": "Slot",
    "swap.current": "Current",
    "swap.alternative": "Alternative",
    "swap.emptySlotAlt": "Empty slot in the main build",
    "swap.emptySlotNote": "This slot is empty in the main build. The swap will be shown as a standalone item.",
    "swap.labelPlaceholder": "When to use it? e.g.: bridge fights",
    "swap.defaultLabel": "New swap",
    "swap.ariaSlot": "Swap {n} slot",
    "swap.ariaPickAlternative": "Choose an alternative item for {slot}",
    "swap.ariaMoveUp": "Move swap {n} up",
    "swap.ariaMoveDown": "Move swap {n} down",
    "swap.ariaRemove": "Remove swap {n}",
    "swap.ariaLabelInput": "Swap {n} label",
    "tierEnchant.tier": "Tier",
    "tierEnchant.enchant": "Enchant",
    "tierEnchant.ariaTier": "Tier for {slot}",
    "tierEnchant.ariaEnchant": "Enchant for {slot}",
    "spellPicker.noAbilities": "No abilities",
    "spellPicker.noAbilitiesTitle": "This item has no abilities.",
    "spellPicker.ariaLabel": "{group} for {item}: {spell}",
    "editorAction.errorUnauthorized": "Your session expired. Sign in again.",
    "editorAction.errorTooManyRequests": "Too many attempts. Please wait a moment.",
    "editorAction.errorBuildNotFound": "We couldn't find this build. It may have been removed.",
    "editorAction.errorInvalidBackground": "The selected background image is invalid. Choose another and try again.",
    "editorAction.errorBuildTooLarge": "The build content is too large to save.",
    "editorAction.errorThemeTooLarge": "The theme is too large to save.",
    "editorAction.errorInvalidSource": "Couldn't save: the source content is invalid.",
    "editorAction.errorGeneric": "Couldn't save.",
    "editorAction.tryAgain": "Try again",
    "editorAction.saved": "Build saved.",
    "editorAction.nameRequired": "Give the build a name",
    "editorAction.needsReadyItem": "Equip at least one item with its abilities filled in",
    "editorAction.unsaved": "unsaved",
    "editorAction.notReadyToExport": "Card isn't ready to export.",
    "editorAction.exportFailed": "Failed to export PNG.",
    "editorAction.signInDialogLabel": "Sign in to save",
    "editorAction.signInDialogMessage": "Sign in to save this build. It won't be lost.",
    "editorAction.notNow": "Not now",
    "editorAction.signIn": "Sign in",
    "theme.uploadUnsupportedFormat": "Unsupported format. Use JPEG, PNG, or WebP.",
    "theme.uploadTooLarge": "This image is {size} MB. The limit is {limit} MB.",
    "theme.uploadFailed": "Couldn't upload the image.",
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
    "theme.announcePresetChanged": "Preset alterado para {preset}.",
    "theme.announceBackgroundApplied": "Imagem de fundo aplicada.",
    "theme.announceBackgroundRemoved": "Imagem de fundo removida.",
    "swap.slot": "Slot",
    "swap.current": "Atual",
    "swap.alternative": "Alternativo",
    "swap.emptySlotAlt": "Slot vazio no build principal",
    "swap.emptySlotNote": "Este slot está vazio no build principal. O swap será exibido como item avulso.",
    "swap.labelPlaceholder": "Quando usar? ex.: fights de bridge",
    "swap.defaultLabel": "Novo swap",
    "swap.ariaSlot": "Slot do swap {n}",
    "swap.ariaPickAlternative": "Escolher item alternativo para {slot}",
    "swap.ariaMoveUp": "Mover swap {n} para cima",
    "swap.ariaMoveDown": "Mover swap {n} para baixo",
    "swap.ariaRemove": "Remover swap {n}",
    "swap.ariaLabelInput": "Rótulo do swap {n}",
    "tierEnchant.tier": "Tier",
    "tierEnchant.enchant": "Encantamento",
    "tierEnchant.ariaTier": "Tier de {slot}",
    "tierEnchant.ariaEnchant": "Encantamento de {slot}",
    "spellPicker.noAbilities": "Sem abilities",
    "spellPicker.noAbilitiesTitle": "Este item não possui abilities.",
    "spellPicker.ariaLabel": "{group} de {item}: {spell}",
    "editorAction.errorUnauthorized": "Sua sessão expirou. Entre novamente.",
    "editorAction.errorTooManyRequests": "Muitas tentativas. Aguarde um instante.",
    "editorAction.errorBuildNotFound": "Não encontramos essa build. Ela pode ter sido removida.",
    "editorAction.errorInvalidBackground": "A imagem de fundo selecionada não é válida. Escolha outra e tente novamente.",
    "editorAction.errorBuildTooLarge": "O conteúdo da build é grande demais para salvar.",
    "editorAction.errorThemeTooLarge": "O tema é grande demais para salvar.",
    "editorAction.errorInvalidSource": "Não foi possível salvar: o conteúdo de origem é inválido.",
    "editorAction.errorGeneric": "Não deu para salvar.",
    "editorAction.tryAgain": "Tentar de novo",
    "editorAction.saved": "Build salva.",
    "editorAction.nameRequired": "Dê um nome pra build",
    "editorAction.needsReadyItem": "Equipe pelo menos um item com as habilidades preenchidas",
    "editorAction.unsaved": "não salvo",
    "editorAction.notReadyToExport": "Card não está pronto para exportar.",
    "editorAction.exportFailed": "Falha ao exportar PNG.",
    "editorAction.signInDialogLabel": "Entrar para salvar",
    "editorAction.signInDialogMessage": "Entre para salvar esta build. Ela não será perdida.",
    "editorAction.notNow": "Agora não",
    "editorAction.signIn": "Entrar",
    "theme.uploadUnsupportedFormat": "Formato não suportado. Use JPEG, PNG ou WebP.",
    "theme.uploadTooLarge": "Essa imagem tem {size} MB. O limite é {limit} MB.",
    "theme.uploadFailed": "Não deu para enviar a imagem.",
  },
};

export function t(locale: Locale, key: MessageKey): string {
  return MESSAGES[locale][key];
}

/**
 * Template variant of `t` for the handful of dynamic strings (aria-labels
 * built from a slot/item name, an index, or a formatted size) added by
 * ACM-120. Placeholders are `{name}` tokens inside the dictionary string,
 * replaced positionally — kept separate from `t` so every other call site
 * (the vast majority, all static) keeps its simpler signature.
 */
export function tf(locale: Locale, key: MessageKey, params: Record<string, string | number>): string {
  return Object.entries(params).reduce<string>(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    t(locale, key)
  );
}
