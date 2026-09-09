---
id: ACM-093
title: 'i18n: toggle de idioma EN/PT-BR para nomes de itens e UI'
status: Done
assignee: []
created_date: '2026-09-08 14:49'
updated_date: '2026-09-09 03:05'
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

Implemented per plano (10 passos) e decision-026. PR #64: https://github.com/LucasGitDev/albion-comp-maker/pull/64

Resumo:
- src/lib/i18n/locales.ts: SUPPORTED_LOCALES/Locale/normalizeLocale/LOCALE_COOKIE, dedupe de SEARCHED_LOCALES (item-index.ts, highlight.ts)
- src/lib/localized-name.ts: resolveLocalizedName() com cadeia locale -> en-US -> undefined
- src/lib/i18n/server-locale.ts: getRequestLocale() (server-only, cookies())
- src/components/i18n/LocaleProvider.tsx + LocaleToggle.tsx: contexto seedado pelo servidor, setLocale grava cookie + router.refresh()
- src/lib/i18n/messages.ts: dicionario minimo (nav, conta, skip link, toggle) — resto do app fica PT-BR hardcoded, fora de escopo
- Call-sites atualizados: build-card-lookups.ts, spell-groups.ts, item-result-list.tsx, ItemPicker.tsx (locale opcional sobrepondo o context via useOptionalLocale), build/new/page.tsx (useMemo com locale nas deps — bug sinalizado pelo architect), build/[slug] e comp/[slug] pages
- Header.tsx: alteracao cirurgica (useLocale, LocaleToggle, strings via t()) — sem tocar em NAV_LINKS alem de tornar dinamico

make check: verde (lint 0 erros/2 warnings pre-existentes de <img>, tsc limpo, build ok, 655 testes passando).

Verificacao manual executada (pnpm dev, porta 3001 pois 3000 estava ocupada por outro worktree):
1. curl sem cookie -> lang=\"en-US\", \"My comps\"/\"Skip to content\" (chrome em EN, corpo do editor em PT-BR conforme escopo)
2. curl com Cookie: acm_locale=pt-BR -> lang=\"pt-BR\", \"Minhas comps\"/\"Nova build\"
3. Teste automatizado public-pages-locale.test.tsx prova que o cookie pt-BR resolve o nome do item no HTML do servidor (AC#2 caminho SSR)
4. Confirmado no ao-data.json real: spell PASSIVE_AA_STACK so tem EN-US; resolveLocalizedName cai para EN-US em vez do uniquename cru (AC#4), coberto por teste unitario e pelo teste de integracao build-card-lookups.test.ts

Nao tocado: editor body, SLOT_LABELS, ThemePanel, metadata (fora de escopo, decision-026).
Conflito ACM-066 (Header.tsx): alteracao cirurgica, sem tocar em NAV_LINKS/rotas alem de renomear para navLinks e tornar dinamico com t().

Merge de origin/main resolvido em Header.tsx: mantida a estrutura navLinks por-render (t(locale, ...)) do ACM-093 e preservado o link /comps do ACM-066 (que havia sido introduzido via NAV_LINKS órfão). Rótulo 'Compartilhar' virou chave i18n nav.share (EN: Share, PT-BR: Compartilhar) em src/lib/i18n/messages.ts. Removido bloco NAV_LINKS órfão e comentário desatualizado sobre navLinks ter só uma entrada. Estendido src/__tests__/header.test.tsx com 2 casos cobrindo o link /comps nos dois idiomas. make check verde (build, lint, tsc, 678 testes). SHA final: e7ff1ab719fae75e28b197b4d765449c7d627fa2, push feito em task/93-i18n-toggle (PR #64 atualiza sozinho).

UI REVIEW (PR #64, commit e7ff1ab) — screenshots em /private/tmp/claude-501/-Users-lucas-dev-lucas-side-albion-builds/bcc6bdc6-303e-4ca4-acb6-9b71f4705c65/scratchpad/acm093/

VEREDITO: BLOQUEADO. AC#2 falha parcialmente e a home page tem mistura de idiomas incoerente com o estado do toggle.

Findings:

[CRITICAL] Home (/) não traduz o conteúdo principal. Com cookie acm_locale=en-US, o toggle mostra "EN" ativo e a nav (My comps/Share/New build) muda para inglês, mas o hero ("Monte comps de Albion Online prontas para o Discord"), subtítulo, botão "Nova build", título "Minhas comps" e empty-state "Nenhuma comp ainda" permanecem em PT-BR. Isso é uma mistura de idiomas visível na mesma tela — pior que não traduzir nada. Screenshots: home-en-US.png vs home-pt-BR.png (toggle igual "EN" ativo nos dois casos de teste com "Sem cookie" e "en-US").

[CRITICAL] Estado padrão (sem cookie) é inconsistente: servidor renderiza toggle "EN" como ativo (aria-pressed=true) mas todo o corpo da página /build/new está em PT-BR ("Detalhes da build", "Papel", "Armas", "Adicionar" etc.), exceto a nav. Ou seja, o default não corresponde a nenhum dos dois idiomas de forma coerente.

[HIGH] Na tela /build/new (AC#2, editor), TODOS os labels e textos de UI (Detalhes da build, Nome do build, Papel, Armas, Armadura, Utilidade, Consumíveis, Swaps, Adicionar, Salvar, Exportar PNG, Aparência, "Dê um nome pra build", breadcrumb "Minhas comps") permanecem fixos em PT-BR independente do cookie/toggle. Só a nav (My comps/Share/Sign in) e — ponto positivo — os NOMES DOS ITENS no seletor de equipamento realmente trocam (confirmado: "Elder's Arcane Staff" com en-US vs "Cajado Amaldiçoado do Ancião" com pt-BR). Ou seja, o requisito literal do AC#2 (nomes de item traduzem) passa, mas o toggle dá a falsa impressão de que troca o idioma da tela inteira quando na really only nav + nomes de item mudam.

[MEDIUM] /build/new em 390px tem overflow horizontal real: document.scrollWidth=1024px vs clientWidth=390px (confirmado via script). O card de equipamento e a linha "Nome do build / Papel" vazam para fora da viewport (ver mobile-buildnew.png — coluna "Botas" cortada, "Papel 0/50" cortado). O header/toggle em si (ACM, Sign in, EN/PT, kebab) NÃO estoura em 390px — isso está ok tanto na home quanto no editor. Não está claro se este overflow do corpo da página é regressão desta task ou pré-existente (fora do escopo do ACM-093/i18n) — reportando como achado pois afeta a usabilidade da tela onde o toggle deveria ser testado.

[OK] Persistência: clicar no toggle PT define cookie acm_locale=pt-BR (Lax, path=/, non-httpOnly) corretamente; após reload, o botão PT continua com aria-pressed=true. AC#3 passa.

[OK] Sem FOUC: o HTML já vem com lang="en-US" ou lang="pt-BR" correto no <html> desde a resposta do servidor (curl confirmado), consistente com a decisão de usar cookie lido no servidor.

[OK] Toggle no header cabe em 390px tanto na home quanto no editor; no menu kebab mobile "My comps"/"Share" aparecem traduzidos corretamente sem quebrar layout (mobile-kebab-menu.png).

[LOW] Acessibilidade do toggle: botões têm aria-pressed correto (true/false) e nome acessível via texto visível ("EN"/"PT"), mas nenhum aria-label mais descritivo (ex.: "Switch to English"/"Mudar para português") — aceitável mas não ideal para leitores de tela, já que "EN"/"PT" sozinhos podem não ser anunciados de forma clara por todos os AT. Contraste do texto inativo (~70% opacity de quase-branco sobre fundo quase-preto) aparenta ok, não medido com ferramenta de contraste formal.

Screenshots relevantes:
- 01-desktop-home-default.png, home-en-US.png, home-pt-BR.png
- buildnew-en-US.png, buildnew-pt-BR.png (fullPage)
- picker-open.png, picker-en-US.png, picker-pt-BR.png (nomes de item corretos)
- mobile-home.png, mobile-buildnew.png, mobile-buildnew-full.png (overflow), mobile-kebab-menu.png

FIX (default-locale defect, escopo restrito): DEFAULT_LOCALE (src/lib/i18n/locales.ts) estava en-US, causando toggle "EN" ativo sobre pagina inteiramente PT-BR sem cookie. Separadas as duas semanticas antes conflated na mesma constante:
- DEFAULT_LOCALE: Locale = "pt-BR" -- default de UI (normalizeLocale/getRequestLocale), usado por <html lang> e estado inicial do toggle.
- FALLBACK_NAME_LOCALE: Locale = "en-US" -- cauda fixa do fallback de resolveLocalizedName (src/lib/localized-name.ts), independente do default de UI, porque ao-data.json garante nome EN-US em todo item/spell mas nao PT-BR (ex. PASSIVE_AA_STACK). AC#4 permanece intacto.
Consumidores reapontados: src/lib/localized-name.ts (resolveLocalizedName) -> FALLBACK_NAME_LOCALE. src/components/item-picker/ItemPicker.tsx mantido em DEFAULT_LOCALE (default de UI correto quando sem locale prop/context).
Testes ajustados/adicionados: src/__tests__/locales.test.ts (asserts diretos DEFAULT_LOCALE=pt-BR, FALLBACK_NAME_LOCALE=en-US), src/__tests__/server-locale-default.test.ts (novo: getRequestLocale sem cookie resolve pt-BR), src/__tests__/public-pages-locale.test.tsx (SSR sem cookie agora espera nome pt-BR), src/__tests__/item-picker.test.tsx (2 casos que assumiam default en-US atualizados para pt-BR, comportamento consequente do fix). src/__tests__/localized-name-fallback.test.ts ja cobria PASSIVE_AA_STACK/AC#4 e continua verde sem alteracao.
NAO alterado: editor, SLOT_LABELS, hero, ThemePanel, metadata -- seguem PT-BR hardcoded fora de escopo (decision-026), conforme instrucao explicita desta correcao. A questao de escopo maior (mistura de idiomas fora do toggle/nomes) permanece escalada ao humano, fora desta correcao.
make check verde (lint, tsc, build, 73 arquivos de teste / 684 testes). SHA final: ver git log.
## Review (PR #64) — SHA auditado: e7ff1ab (origin/task/93-i18n-toggle, merge commit atualizado)

Codigo lido via worktree ../albion-comp-maker-task-93 no SHA e7ff1ab (confirmado com git log -1). Rodei npm test (678/678 verdes) e tsc --noEmit (limpo) diretamente nesse SHA.

### Verificacao dos pontos pedidos

1. AC#2/AC#4 (fallback): `resolveLocalizedName` (src/lib/localized-name.ts) implementa locale -> en-US -> undefined corretamente, delegando para `pickLocalizedName` tolerante a casing. Teste `localized-name-fallback.test.ts` cobre exatamente o caso PASSIVE_AA_STACK (EN-US only) e casing CDN "PT-BR". OK.

2. ARMADILHA do useMemo sem `locale` nas deps: VERIFICADO DE FATO no arquivo (nao por alegacao) — src/app/(editor)/build/new/page.tsx:128-142. `itemNames` tem deps `[items, locale]` e `spellCandidatesByItemId` tem deps `[items, locale]`; `cardLookups` (linha 168) deriva de ambos. Cadeia de recomputo correta. O bug sinalizado pelo architect NAO esta presente.

3. Dedupe SEARCHED_LOCALES: `grep -rn "SEARCHED_LOCALES" src` retorna apenas o comentario em `src/lib/i18n/locales.ts` (mencao textual, nao declaracao). `item-index.ts` e `highlight.ts` importam `SUPPORTED_LOCALES`/`otherLocaleOf` de `@/lib/i18n/locales`. Confirmado.

4. SSR sem JS: `public-pages-locale.test.tsx` e um teste real, nao fraco — invoca a page function real (`PublicBuildPage({params})`), mocka `next/headers.cookies()` e `fs.readFile` (dado real do ao-data), e faz assert em `container.textContent` do HTML renderizado (contains "Espada Larga", not-contains "Broadsword"). Prova o caminho SSR de fato. OK.

5. `<html lang>`: virou dinamico. `RootLayout` agora e async, le `getRequestLocale()`, usa `lang={locale}` (era fixo "pt-BR"). Skip link tambem usa `t(locale, "a11y.skipToContent")`. Confirmado no diff.

6. Escopo: fechado exatamente conforme decision-026. `messages.ts` cobre so nav (myComps, share — share ja existia hardcoded no Header original, nao e string nova), conta, skip link, toggle labels. Nenhum touch em SlotCard/SLOT_LABELS/ThemePanel/metadata (grep confirmou 0 arquivos). Sem novas dependencias em package.json.

7. Merge ACM-066: diff entre a versao do branch e origin/main para `src/lib/public-content.ts`, `src/actions/comps.ts`, `src/lib/comp-publish-status.ts` e `drizzle/0004_add_comp_is_public.sql` e VAZIO (arquivos identicos, nada perdido no merge alem do Header ja mencionado pelo implementer).

8. Testes: nenhum teste encontrado que apenas espelhe a implementacao. `public-pages-locale.test.tsx` e `build-card-lookups.test.ts` testam comportamento observavel (HTML renderizado / fallback real). `locale-toggle.test.tsx` e `header.test.tsx` testam efeito (cookie escrito, router.refresh chamado, string trocada) e nao detalhes internos.

### Findings
Nenhum finding CRITICAL/HIGH. Nenhum MEDIUM relevante alem de nota informativa: `nav.share` foi incluido no dicionario ainda que nao listado explicitamente na decision-026 (que citava so myComps + conta + skip link + toggle) — porem a string "Compartilhar" ja existia hardcoded no Header antes desta task, entao traduzi-la e consistente com "chrome global do Header" e nao e scope creep real (LOW, nao bloqueia).

### Veredito: LGTM
make check equivalente rodado manualmente no SHA e7ff1ab: tsc --noEmit limpo, 72 arquivos de teste / 678 testes verdes. Merge com ACM-066 intacto. Nenhum AC violado (desvio de "localStorage" para cookie e decisao arquitetural documentada e correta tecnicamente, nao um bug).

ORCHESTRATOR - defeito de default corrigido; MERGE RETIDO aguardando decisao de produto do humano.

CRITICAL #2 da revisao visual (estado default incoerente) CORRIGIDO em 0576634 e verificado por mim direto no branch:
- DEFAULT_LOCALE agora e 'pt-BR' (default de UI: normalizeLocale, getRequestLocale, <html lang>, estado inicial do toggle)
- FALLBACK_NAME_LOCALE novo, fixo em 'en-US' (cauda da cadeia de resolveLocalizedName)
A separacao era obrigatoria: DEFAULT_LOCALE acumulava dois papeis semanticos e trocar direto para pt-BR teria QUEBRADO o AC#4 silenciosamente, porque todo item do ao-data.json tem nome EN-US mas nem todos tem PT-BR (PASSIVE_AA_STACK). Doc comments nos dois avisam para nao reunificar. 684 testes verdes.

CRITICAL #1 (mistura de idiomas com EN selecionado) NAO e defeito: e exatamente o escopo da decision-026, que limitou v1 a ~10 chaves de chrome global e deixou editor/SLOT_LABELS/hero/ThemePanel/metadata fora de proposito. O reviewer de codigo confirmou aderencia ao escopo. Porem o ponto de PRODUTO do ui-reviewer procede: um toggle de idioma que deixa a maior parte da tela no outro idioma parece quebrado para o usuario, independente do que diz o ADR. Nomes de item trocam corretamente ('Elder's Arcane Staff' <-> 'Cajado Amaldicoado do Anciao'), entao o AC#2 literal passa.

ESCALADO AO HUMANO (decisao de produto, nao de implementacao) - 3 opcoes: (1) mergear como esta, ja que o default pt-BR torna a primeira visita coerente e so quem escolhe EN ativamente ve mistura; (2) expandir a ACM-093 para traduzir o chrome do editor, contrariando decision-026; (3) mergear e abrir follow-up de i18n completo do editor. Recomendacao do orchestrator: opcao 3.

Overflow de 390px relatado pelo ui-reviewer e pre-existente e ja rastreado pela ACM-078 — nao e regressao desta task.
<!-- SECTION:NOTES:END -->
