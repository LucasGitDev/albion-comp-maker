---
id: decision-026
title: >-
  Locale toggle EN/PT-BR: cookie como fonte de verdade, LocaleProvider e
  dicionario minimo de UI
date: '2026-09-09 02:27'
status: accepted
---
## Context

ACM-093 pede um toggle EN-US/PT-BR que troque (a) nomes de itens/spells vindos de
`ao-data.json` e (b) strings de UI, persistindo a preferencia entre sessoes, com
fallback para EN quando o PT-BR nao existe.

Estado atual da superficie:

- Resolucao de nome tem um unico helper: `src/lib/localized-name.ts`
  (`pickLocalizedName(names, locale)`), tolerante a casing (`"EN-US"` vs `"en-US"`).
- O locale esta **hardcoded** em quatro lugares:
  - `src/app/(editor)/build/new/page.tsx:34` — `const LOCALE = "en-US"` (client).
  - `src/lib/build-card-lookups.ts:15` — `const LOCALE = "en-US"` (**server-only**,
    `import "server-only"`, le `ao-data.json` via `fs`).
  - `src/components/item-picker/ItemPicker.tsx:60` — default de prop.
  - `src/components/editor/SlotPickerPopover.tsx:211` — call-site.
- `SEARCHED_LOCALES = ["en-US","pt-BR"]` esta **duplicado** em
  `src/lib/item-index.ts:15` e `src/components/item-picker/highlight.ts:14`
  (duplicacao deliberada em ACM-028 por escopo de arquivo da task, nao por
  razao arquitetural).
- Gaps reais de traducao existem (ex.: spell `PASSIVE_AA_STACK` so tem `EN-US`),
  logo a cadeia de fallback e obrigatoria, nao teorica.
- **Nao existe** React Context/Provider algum em `src/` — ACM-037 evitou ate
  `SessionProvider` (ver `Header.tsx:12-19`); `Header` e `EditorActionBar`
  resolvem auth via `fetch` independente.
- **Nao existe** uso de `localStorage` nem hook de persistencia no repo.
- **Nao existe** dicionario de strings; PT-BR esta hardcoded no JSX
  (`Header.tsx:47,140,154,161,181`, `app/layout.tsx:20,36`).
- `src/app/layout.tsx:28` tem `lang="pt-BR"` fixo.
- ACM-023 ja decidiu **nao** usar rotas `/[locale]/...`.

### O problema central

`build-card-lookups.ts` resolve nomes **no servidor** para as paginas publicas
`/build/[slug]` e `/comp/[slug]`. Um toggle client-side guardado em
`localStorage` e invisivel para o servidor: o HTML chegaria sempre em EN e so
mudaria depois de uma passada de JS no cliente — ou nunca, ja que essas paginas
sao renderizadas sem exigir JS por design (ACM-021: "No client JS is required to
see the card").

## Opcoes consideradas

### A. `localStorage` + re-resolucao/hidratacao no cliente

Servidor renderiza EN; um client component le `localStorage` no `useEffect` e
re-resolve os nomes.

- (+) Cumpre a letra do AC ("localStorage").
- (-) Exige embarcar o catalogo (ou ao menos o subset de nomes) no cliente das
  paginas publicas, que hoje nao carregam catalogo nenhum.
- (-) Flash de idioma errado (FOUC textual) em toda navegacao.
- (-) Quebra a propriedade "pagina publica funciona sem JS" de ACM-021.
- (-) Nao conserta `lang` do `<html>` sem mutacao DOM pos-hidratacao.

### B. Enviar **os dois** locales no payload e escolher no cliente

`BuildCardLookups` passaria a carregar `itemNames: Record<id, Record<locale,string>>`.

- (+) Sem round-trip extra; troca instantanea.
- (-) Muda o contrato de `BuildCardLookups`, que e consumido tambem pelo editor
  e pelo `BuildCard` usado no capture root do export PNG — mudanca de tipo com
  raio grande para o ganho.
- (-) Ainda exige JS no cliente para escolher; mesmo FOUC de A.
- (-) Dobra o payload de nomes por card sem que o segundo idioma seja usado em
  99% dos renders.

### C. **Cookie** como fonte de verdade, lido no servidor e no cliente

Cookie `acm_locale` (nao-HttpOnly, `Path=/`, `SameSite=Lax`, `Max-Age` 1 ano).
Server components leem via `cookies()`; o toggle escreve via `document.cookie` e
chama `router.refresh()`.

- (+) O servidor ja sabe o idioma no primeiro byte: zero FOUC, zero JS exigido
  para o conteudo ficar correto.
- (-) Nao e literalmente `localStorage` (o AC #1 cita localStorage).
- (-) Ler `cookies()` no `RootLayout` opta o layout por render dinamico.

### Nota sobre o custo de C

O custo de render dinamico e ~zero aqui: `/build/[slug]` e `/comp/[slug]` ja
declaram `export const dynamic = "force-dynamic"`, e as rotas autenticadas
(`/builds`, editor) ja dependem de sessao/DB. Nao ha hoje nenhuma pagina cuja
estaticidade se perca de forma relevante.

## Decisao

**Opcao C**, com quatro partes:

1. **Cookie `acm_locale` e a unica fonte de verdade.** Sem `localStorage`, para
   nao ter dois storages divergindo. Interpretamos o AC #1 pelo requisito real
   ("preferencia persiste entre sessoes"), nao pelo mecanismo citado; cookie de 1
   ano satisfaz isso e e o unico mecanismo que tambem satisfaz o AC #2 ("nomes
   dos itens mudam") nas paginas publicas SSR. Registrado aqui explicitamente
   como desvio consciente do texto do AC.

2. **Um `LocaleProvider` (React Context) e introduzido**, semeado por valor lido
   no servidor em `RootLayout` e passado como prop. Isso contraria o habito de
   ACM-037, e a diferenca e justificada: auth e consumida por 2 componentes
   isolados e tolera resolucao assincrona; locale e lido por praticamente toda
   arvore client (picker, spell groups, card, chrome) e **nao tolera** resolucao
   assincrona, porque resolver depois da hidratacao e exatamente o FOUC que a
   opcao C existe para eliminar. Um provider com valor ja conhecido no primeiro
   render nao faz fetch e nao tem custo de rede.

3. **Cadeia de fallback explicita e centralizada**:
   `locale pedido -> "en-US" -> uniquename` (para spells, encadeia antes do
   fallback ja definido em decision-021: familia de arma / tier / humanizado).
   Implementada como `resolveLocalizedName()` em `src/lib/localized-name.ts`;
   `pickLocalizedName` permanece como primitiva de lookup puro, sem fallback.

4. **Escopo de "strings de UI" em v1 e deliberadamente minimo**: um dicionario
   tipado `src/lib/i18n/messages.ts` (`Record<Locale, Record<MessageKey,string>>`)
   cobrindo **apenas** o chrome global — links de nav do `Header`, rotulos do
   menu de conta, skip link e os rotulos do proprio toggle. **Nenhuma biblioteca
   de i18n** (`next-intl`, `react-i18next`) e adicionada: ~10 strings estaticas
   nao justificam runtime de ICU, plurais, ou middleware de negociacao de locale;
   e a principal feature de todas elas — routing por locale — ja foi rejeitada
   em ACM-023.

## Fora de escopo (nao fazer nesta task)

- Traduzir o corpo do editor, estados de erro, `SwapsSection`, `ThemePanel`,
  toasts e labels de slot (`SLOT_LABELS`). Ficam em PT-BR; migram por
  incremento depois, reusando `messages.ts`.
- `metadata` por locale em `app/layout.tsx` (`generateMetadata` dinamico) e
  qualquer trabalho de SEO/`hreflang`.
- Rotas `/[locale]/...` — ja rejeitado por ACM-023.
- Persistir locale por usuario no banco. Cookie e por-dispositivo, e suficiente.
- Deteccao automatica por `Accept-Language`. Default e `en-US`, explicito e
  previsivel; o usuario troca uma vez.
- Nomes localizados dentro do PNG exportado alem do que ja sai naturalmente: o
  capture root e o mesmo DOM do cliente, entao segue o locale ativo de graca —
  nenhum trabalho extra, mas tambem nenhuma garantia de "exportar em outro
  idioma que nao o da tela".

## Consequences

- `RootLayout` passa a ser dinamico (le `cookies()`). Aceito; ver nota acima.
- `<html lang>` deixa de ser fixo e passa a refletir o locale ativo — ganho de
  acessibilidade que a opcao A nao entregava.
- `build-card-lookups.ts` ganha um parametro `locale` explicito em vez da
  constante. O `LOCALE` hardcoded some dos 4 call-sites.
- `SEARCHED_LOCALES` deixa de existir em duplicata; passa a `SUPPORTED_LOCALES`
  em `src/lib/i18n/locales.ts`, com `Locale` como union type. Isso torna `locale:
  string` -> `locale: Locale` nas assinaturas de `item-index.ts` e `ItemPicker`,
  o que e uma melhoria de tipagem mas toca varios arquivos de uma vez.
- Trocar o idioma numa pagina publica dispara `router.refresh()` (round-trip ao
  servidor). Perceptivel mas correto; e uma acao rara.
- Cookie e legivel por JS (nao-HttpOnly) por necessidade. Nao carrega dado
  sensivel — apenas `"en-US"` ou `"pt-BR"` — e todo consumo deve validar contra
  `SUPPORTED_LOCALES` antes de usar, nunca confiar no valor cru.
- Se no futuro quisermos locale por conta, o cookie vira cache do valor do DB;
  a mudanca fica contida em quem semeia o provider.
