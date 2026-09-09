---
id: ACM-093
title: 'i18n: toggle de idioma EN/PT-BR para nomes de itens e UI'
status: In Progress
assignee: []
created_date: '2026-09-08 14:49'
updated_date: '2026-09-09 02:30'
labels: []
milestone: m-7
dependencies: []
priority: high
ordinal: 91000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nomes dos itens aparecem em inglês. Adicionar toggle de idioma (EN / PT-BR) que persiste no localStorage. Nomes de itens e strings de UI mudam conforme seleção. Relacionado a ACM-023 (i18n routing) — este foca no toggle de idioma para nomes do ao-data.json.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Toggle EN/PT-BR visível no header|Nomes dos itens mudam para o idioma selecionado|Preferência persiste entre sessões (localStorage)|Fallback para EN se tradução PT-BR ausente
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Plano de implementacao (ACM-093) — ver decision-026

Decisao arquitetural em **decision-026**: cookie `acm_locale` como unica fonte de
verdade (NAO localStorage), lido no servidor via `cookies()` e propagado ao
cliente por um `LocaleProvider`. Motivo: `src/lib/build-card-lookups.ts` resolve
nomes SERVER-SIDE para `/build/[slug]` e `/comp/[slug]`, e essas paginas
renderizam sem exigir JS (ACM-021) — `localStorage` e invisivel para o servidor.
Ler a decision antes de comecar; ela tambem delimita o escopo de strings de UI.

### Passo 1 — Fundacao de locale (novo modulo `src/lib/i18n/`)

Criar `src/lib/i18n/locales.ts`:
- `export const SUPPORTED_LOCALES = [\"en-US\", \"pt-BR\"] as const`
- `export type Locale = (typeof SUPPORTED_LOCALES)[number]`
- `export const DEFAULT_LOCALE: Locale = \"en-US\"`
- `export const LOCALE_COOKIE = \"acm_locale\"`
- `export function isLocale(v: unknown): v is Locale`
- `export function normalizeLocale(v: string | undefined | null): Locale` — valida
  contra SUPPORTED_LOCALES (case-insensitive) e cai em DEFAULT_LOCALE. Nenhum
  consumidor pode confiar no valor cru do cookie.
- `export function otherLocaleOf(locale: Locale): Locale | undefined`

Verificavel: `tsc --noEmit` passa; novo teste `src/__tests__/locales.test.ts`
cobre `normalizeLocale` com `\"pt-br\"`, `\"fr-FR\"`, `undefined`, `\"\"`.

### Passo 2 — Deduplicar SEARCHED_LOCALES

- `src/lib/item-index.ts`: remover `const SEARCHED_LOCALES` (linha 15), importar
  `SUPPORTED_LOCALES` / `otherLocaleOf` de `@/lib/i18n/locales`. Trocar
  `SearchOptions.locale: string` -> `locale: Locale`; `scoreToken(..., activeLocale: Locale)`
  usa `otherLocaleOf` em vez do `.find` inline (linha 143).
- `src/components/item-picker/highlight.ts`: remover o `export const SEARCHED_LOCALES`
  (linha 14) e a `otherLocaleOf` local (linhas 16-18); re-exportar de
  `@/lib/i18n/locales` OU atualizar os imports em `item-result-list.tsx`.
  Atualizar o comentario de cabecalho que diz \"deliberadamente duplica ... a lista
  de locales\" — a razao era escopo de arquivo da ACM-028, nao arquitetural.
- Grep de aceite: `grep -rn \"SEARCHED_LOCALES\" src` retorna 0 resultados fora de
  `src/lib/i18n/locales.ts`.

Verificavel: suites existentes `item-picker.test.tsx`, `item-picker-polish.test.tsx`
continuam verdes sem alteracao de comportamento.

### Passo 3 — Cadeia de fallback centralizada

`src/lib/localized-name.ts`: manter `pickLocalizedName` como esta (primitiva de
lookup puro, tolerante a casing — nao mexer). Adicionar:

```
export function resolveLocalizedName(
  names: Record<string, string> | undefined,
  locale: Locale
): string | undefined   // locale pedido -> DEFAULT_LOCALE -> undefined
```

Motivo (AC #4): gaps reais existem, ex. o spell `PASSIVE_AA_STACK` so tem `EN-US`.

Novo teste `src/__tests__/localized-name-fallback.test.ts`:
1. PT-BR presente -> devolve PT-BR
2. PT-BR ausente, EN-US presente -> devolve EN-US (o caso do AC #4)
3. ambos ausentes -> `undefined` (chamador cai no uniquename)
4. chaves em casing do CDN (`\"PT-BR\"`) resolvem para `locale === \"pt-BR\"`

### Passo 4 — Propagar `locale` pelos resolvers puros (sem UI ainda)

- `src/components/editor/spell-groups.ts`: `locale: string` -> `Locale` nas duas
  assinaturas (linhas ~35 e ~96); trocar `pickLocalizedName` (linha 55) por
  `resolveLocalizedName`. **Atencao**: o fallback de decision-021 (familia de
  arma / tier / humanizado) roda DEPOIS do fallback de locale, nunca antes.
- `src/lib/build-card-lookups.ts`: remover `const LOCALE` (linha 15); assinatura
  vira `buildCardLookupsFor(state: BuildState, locale: Locale)`. Usar
  `resolveLocalizedName` na linha 90 e passar `locale` para `groupSpellsForItem`
  (linha 99). O cache de modulo (`cachedItemsByUniquename`) e por uniquename e
  independente de locale — **nao** precisa ser chaveado por locale, nao mexer.
- `src/components/item-picker/item-result-list.tsx`: `locale: string` -> `Locale`;
  `pickLocalizedName` (linha 132) -> `resolveLocalizedName`.

Atualizar `src/__tests__/build-card-lookups.test.ts` para o novo parametro e
**adicionar um caso** `pt-BR` que prove: item com PT-BR usa PT-BR, item so com
EN-US cai em EN-US, item sem nome nenhum cai no uniquename.

### Passo 5 — LocaleProvider + hook

Criar `src/components/i18n/LocaleProvider.tsx` (`\"use client\"`):
- Context com `{ locale: Locale; setLocale(next: Locale): void }`.
- Prop `initialLocale: Locale` — semeado pelo servidor, entao o PRIMEIRO render
  ja tem o valor certo (zero flash, zero fetch). Nao ha `useEffect` de leitura.
- `setLocale` escreve `document.cookie = \`acm_locale=<v>; Path=/; Max-Age=31536000; SameSite=Lax\``
  (sem HttpOnly, por necessidade; sem `Secure` em dev — usar `location.protocol === \"https:\"`
  para decidir), atualiza o state e chama `router.refresh()` do `next/navigation`
  para que os nomes resolvidos no servidor sejam re-renderizados.
- `export function useLocale(): Locale` — lanca erro claro se usado fora do
  provider (evita degradar silenciosamente para EN).

Criar `src/lib/i18n/server-locale.ts` com `import \"server-only\"`:
- `export async function getRequestLocale(): Promise<Locale>` — `cookies()` +
  `normalizeLocale`. Deve respeitar o guard de `src/__tests__/server-only-boundary.test.ts`.

Nota de contexto: NAO existia nenhum Context/Provider no `src/` (ACM-037 evitou
ate `SessionProvider`). A justificativa para abrir excecao aqui esta em
decision-026 — nao replicar o padrao de \"cada componente resolve sozinho via
fetch\" do `Header`, porque para locale isso significa resolucao pos-hidratacao,
que e exatamente o FOUC que estamos evitando.

### Passo 6 — Dicionario minimo de UI

Criar `src/lib/i18n/messages.ts`: `type MessageKey`, `const MESSAGES: Record<Locale, Record<MessageKey, string>>`,
`export function t(locale: Locale, key: MessageKey): string`.

Cobrir APENAS (escopo fechado em decision-026):
- `nav.myComps` (hoje `Header.tsx:47`, \"Minhas comps\")
- as strings de conta/menu em `Header.tsx:140,154,161,181` e o fallback \"Conta\"
- `a11y.skipToContent` (`app/layout.tsx:36`, \"Pular para o conteudo\")
- `locale.toggleLabel` / rotulos `EN` e `PT`

Tudo mais (corpo do editor, `SLOT_LABELS`, `SwapsSection`, `ThemePanel`, estados
de erro, `metadata`) permanece PT-BR hardcoded — **fora de escopo, nao traduzir**.

Teste `src/__tests__/i18n-messages.test.ts`: toda `MessageKey` existe nos dois
locales (paridade de chaves), garantido por tipo E por assert em runtime.

### Passo 7 — Wiring no RootLayout

`src/app/layout.tsx`:
- `export default async function RootLayout` — `const locale = await getRequestLocale()`
- `<html lang={locale}>` no lugar do `\"pt-BR\"` fixo (linha 28)
- envolver o corpo em `<LocaleProvider initialLocale={locale}>`
- skip link (linha 36) usa `t(locale, \"a11y.skipToContent\")`
- `metadata` estatico fica como esta (fora de escopo)

Efeito colateral aceito e documentado em decision-026: o layout passa a ser
renderizado dinamicamente. Custo real ~zero — `/build/[slug]` e `/comp/[slug]` ja
sao `force-dynamic` e as demais rotas dependem de sessao/DB.

### Passo 8 — Toggle no Header

Criar `src/components/i18n/LocaleToggle.tsx` (`\"use client\"`): dois botoes
(EN / PT) num `role=\"group\"` com `aria-label`, o ativo com `aria-pressed=\"true\"`.
Nao usar `<select>` — sao so dois valores e o alvo de clique fica melhor.

`src/components/layout/Header.tsx`: `useLocale()`, trocar as strings hardcoded
pelas de `t(locale, ...)`, montar o `<LocaleToggle />` na barra desktop e no
painel mobile. Nao tocar em `useAccountState` — auth continua como esta (ACM-037).

### Passo 9 — Call-sites que ainda tem locale hardcoded

- `src/app/(editor)/build/new/page.tsx`: remover `const LOCALE` (linha 34),
  `const locale = useLocale()`; usar nas linhas 138 e 146; **incluir `locale` nos
  arrays de dependencia dos `useMemo`** que constroem `itemNames` e
  `spellGroupsByItem` — senao os nomes nao re-renderizam ao trocar o idioma
  (bug mais provavel desta task).
- `src/components/item-picker/ItemPicker.tsx`: remover o default `\"en-US\"` da
  linha 60; a prop `locale?: Locale` continua **opcional e sobrepondo** o context
  (as suites existentes passam locale explicito), com fallback para `useLocale()`.
- `src/components/editor/SlotPickerPopover.tsx`: nada a fazer no call-site de
  `ItemPicker` (linha ~211) alem de confirmar que herda do context.
- `src/app/build/[slug]/page.tsx` e `src/app/comp/[slug]/page.tsx`:
  `const locale = await getRequestLocale()` e passar para `buildCardLookupsFor`.
  Atualizar o comentario \"i18n (ACM-023) is not implemented yet\" — segue sem
  rotas por locale, mas os nomes agora sao localizados.

### Passo 10 — Testes de integracao

- `src/__tests__/locale-toggle.test.tsx` (novo): renderiza `LocaleProvider` +
  `LocaleToggle`; clicar em PT escreve `acm_locale=pt-BR` em `document.cookie`
  e chama `router.refresh` (mock de `next/navigation`); `aria-pressed` acompanha.
- `src/__tests__/header.test.tsx`: envolver no `LocaleProvider` (vai quebrar sem
  isso — `useLocale` lanca fora do provider). Asserir que com `pt-BR` sai
  \"Minhas comps\" e com `en-US` sai a string EN.
- `src/__tests__/public-pages.test.tsx`: caso com cookie `pt-BR` renderiza nome
  PT-BR do item **no HTML do servidor** (essa e a prova do AC #2 no caminho SSR).
- `src/__tests__/item-picker.test.tsx`: confirmar que passar `locale` explicito
  ainda sobrepoe o context.

### Ordem e paralelismo

Passos 1-4 sao puros/sem UI e devem ir primeiro; 5-9 dependem deles. Nao
paralelizar: passos 2, 4 e 9 tocam os mesmos arquivos de `src/lib/` e
`src/components/item-picker/`. Nenhuma dependencia nova de package — nada de
`next-intl` (justificado em decision-026), entao `package.json` nao e tocado.

### touches

```
src/lib/i18n/**
src/lib/localized-name.ts
src/lib/item-index.ts
src/lib/build-card-lookups.ts
src/components/i18n/**
src/components/layout/Header.tsx
src/components/item-picker/highlight.ts
src/components/item-picker/item-result-list.tsx
src/components/item-picker/ItemPicker.tsx
src/components/editor/spell-groups.ts
src/components/editor/SlotPickerPopover.tsx
src/app/layout.tsx
src/app/(editor)/build/new/page.tsx
src/app/build/[slug]/page.tsx
src/app/comp/[slug]/page.tsx
src/__tests__/**
```

### Verificacao manual (DoD item 3)

1. Abrir `/build/new`, escolher um item com traducao PT-BR, clicar PT no header:
   o nome do item no card muda sem reload.
2. Dar F5: continua em PT (cookie persistiu).
3. Abrir uma `/build/[slug]` publica com JS desabilitado no browser: os nomes
   ja chegam em PT-BR no HTML.
4. Selecionar um item cujo spell so tem EN-US (ex. `PASSIVE_AA_STACK`) em PT:
   o nome do spell aparece em EN, nunca o uniquename cru (AC #4).
<!-- SECTION:NOTES:END -->
