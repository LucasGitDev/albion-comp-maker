---
id: decision-013
title: Validacao runtime do payload de build - zod server-only, size cap e leitura tolerante
date: '2026-09-07'
status: accepted
---

## Contexto

`builds.content` (o `data_json`) e persistido por `saveBuild`/`updateBuild` em
`src/actions/builds.ts` como uma `string` opaca, com **zero** validacao em runtime.
O comentario em `src/db/schema.ts` afirmando que a coluna e "validated by a shared
Zod schema at the application layer" e falso — nenhum schema existe.

Hoje o dado so retorna para o proprio dono, entao o risco esta contido. Ele deixa
de estar contido na ACM-021, que renderiza paginas publicas de build via SSR a
partir dessa coluna. Vetor concreto ja presente no codigo:

- `src/components/build-card/BuildCardVertical.tsx` faz `style={{ color: accent }}`
  e `style={{ backgroundColor: accent }}`;
- `BuildCardGrid.tsx` faz o mesmo.

`accent` e uma string livre vinda do cliente. React escapa o valor, mas nao impede
injecao de CSS (`url(...)`, etc.) nem valores absurdos. Sem cap de tamanho, tambem
ha abuso trivial de storage.

Restricao adicional: este e um app Next.js pesado no cliente e a ACM-043 tem
criterio explicito de nao degradar tempo de carga do cliente.

## Opcoes consideradas

### A. `zod` como dependencia direta de producao, importada apenas no servidor (escolhida)

- Custo de bundle **cliente: zero**, desde que o modulo do schema seja server-only.
  Verificado: nao existe hoje nenhum consumidor cliente; o unico lugar que
  desserializa build e o servidor. O modulo do schema recebe `import "server-only"`,
  o que transforma um vazamento futuro para o cliente em **erro de build**, nao em
  regressao silenciosa de performance.
- Estado atual da arvore: `zod@4.5.4` **ja esta no `pnpm-lock.yaml`**, porem apenas
  como transitiva **dev-only** de `eslint-config-next > eslint-plugin-react-hooks`.
  Nao existe `node_modules/zod` no topo (pnpm e estrito), entao **nao e utilizavel**
  e depender dela seria errado de qualquer forma: uma transitiva de um plugin de
  lint pode sumir em qualquer bump de `eslint-config-next`, e ela e dev-only —
  quebraria o build de producao. **Deve ser declarada explicitamente.**
- Efeito colateral bom: a versao ja resolvida no lock e `4.5.4`, entao adicionar
  `zod: ^4.5.4` nao introduz nova resolucao nem duplicata.

### B. `valibot`

Menor que zod quando vai para o cliente (~1-3 kB tree-shaken vs ~12 kB). Mas o
ganho e sobre um bundle cliente que aqui e **zero nos dois casos**. Em troca:
ecossistema menor, menos familiaridade, e nao esta no lock. Otimizar um custo que
nao existe.

### C. Type guards escritos a mao, sem dependencia

Zero dependencia, zero serializacao contra outras lanes. Porem: ~150 linhas para
cobrir 10 slots + swaps aninhados, com AC#3 (rejeitar/remover campos desconhecidos)
exigindo whitelist manual de chaves em cada nivel — exatamente o tipo de codigo
onde um campo esquecido vira o bug. E nao ha mecanismo de deteccao de drift contra
`BuildState`. Rejeitada por custo de manutencao, nao por custo de bundle.

### D. Nao validar, so limitar tamanho

Resolve DoS de storage, nao resolve o precursor de stored XSS. Insuficiente para
liberar a ACM-021.

## Decisao

1. **Adicionar `zod` (`^4.5.4`) como dependencia de producao direta.**
   `package.json` e `pnpm-lock.yaml` **mudam** — esta task deve ser serializada
   contra qualquer outra lane que toque esses arquivos (regra de CLAUDE.md).

2. **Schema unico em `src/lib/build-schema.ts`**, com `import "server-only"` no
   topo. Fonte de verdade dos slots e `SLOT_ORDER` de `src/types/build.ts`, **nao**
   o tipo `Slot` de `src/data/ao-data.d.ts` — este ultimo e
   `"mainhand" | ... | string`, ou seja, colapsa para `string` e nao restringe nada.

3. **Anti-drift por compile-time**, nao por duplicacao. O schema e checado contra
   `BuildState` com uma assercao bidirecional que quebra `tsc --noEmit`:

   ```ts
   type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
   const _buildSchemaMatchesType: Exact<z.infer<typeof buildStateSchema>, BuildState> = true;
   ```

   Se alguem adicionar um campo em `BuildState` sem tocar no schema (ou vice-versa),
   o `make check` falha. Nao se usa `z.infer` como fonte do tipo: `BuildState` e
   consumido pelo store cliente e nao pode passar a depender de um modulo server-only.

4. **Ordem de validacao na escrita** (`saveBuild` / `updateBuild`), defense-in-depth:
   1. cap de bytes sobre a string crua, **antes** de `JSON.parse` (guarda barata
      contra payload de 50 MB);
   2. `JSON.parse` em `try/catch`;
   3. `buildStateSchema.parse()` com objetos `.strict()` em todos os niveis (AC#3:
      campo desconhecido e **rejeitado**, nao removido — `.strip()` silencioso
      esconderia bug de cliente);
   4. **re-serializar a partir do objeto validado** e persistir esse resultado, nunca
      a string original. Isso normaliza o dado e garante que o que esta no banco e
      exatamente o que passou pelo schema.

5. **Leitura tolerante, escrita estrita.** Ver secao de compatibilidade.

## Cap de tamanho: 128 KiB (131072 bytes)

Medido como comprimento em **bytes UTF-8** (`Buffer.byteLength(content, "utf8")`),
nao `.length` — `.length` conta UTF-16 code units e subestima nomes com acentos/emoji.

Derivacao do pior caso real, a partir de `src/types/build.ts`:

- Um `EquippedItem` serializado: `itemId` (uniquename tipo
  `T8_2H_INFERNOSTAFF_MORGANA@4`, ~30 chars; folga para 64) + `tier` + `enchant` +
  `twohanded` + `spells` com 4 ids de ~64 chars + chaves e pontuacao (~90 B)
  → **~410 B, arredondado para 512 B**.
- Build base: 10 slots x 512 B = 5,1 KB + chaves de slot (~100 B) + `name`, `role`,
  `accent`, `schemaVersion` → **~5,5 KB**.
- Um `Swap`: `id` (nanoid, 21) + `label` + ate 10 slots → **~5,3 KB**.
- Comp cheia com **10 swaps**: 5,5 + 53 → **~59 KB**.

**128 KiB da ~2x de folga sobre o pior caso plausivel** e ainda e pequeno o
bastante para que abuso de storage exija milhares de rows (o rate limit de escrita
ja existente em `src/lib/rate-limit.ts` cobre o resto).

O cap de bytes e apenas a guarda externa. A defesa real sao os limites por campo,
que devem estar no schema:

| campo | limite |
|---|---|
| `schemaVersion` | `z.literal(1)` |
| `name` | 1..100 chars |
| `role` | 0..50 chars |
| `accent` | `/^#[0-9a-fA-F]{6}$/` — **obrigatorio**, e o vetor de injecao de CSS |
| `itemId`, spell ids | 1..128 chars, `/^[A-Z0-9_@#]+$/i` |
| `tier` | int 1..8 |
| `enchant` | int 0..4 |
| `swaps` | max 20 |
| `swaps[].label` | 1..60 chars |
| `slots` | chaves exatamente `SLOT_ORDER`, valor `EquippedItem \| null` |

## Compatibilidade com rows ja persistidas

Rows escritas antes desta task nao passaram por schema nenhum e podem falhar um
`.parse()` estrito. Aplicar o schema estrito no caminho de **leitura** quebraria o
carregamento de builds existentes — inaceitavel.

Regra: **escrita estrita, leitura tolerante.**

- Expor `parseBuildContent(raw: string): { ok: true; data: BuildState } | { ok: false; reason: "too-large" | "invalid-json" | "invalid-shape" }`.
  Nunca lanca.
- Pagina do dono (`/builds/[id]`): em `ok: false`, renderizar estado de erro
  ("esta build esta corrompida / foi salva em formato antigo") com opcao de
  excluir. Nunca 500.
- Pagina publica SSR (ACM-021): em `ok: false`, `notFound()`. Conteudo que nao
  valida **nao e servido a terceiros** — este e o ponto inteiro da task.
- Nao fazer migracao automatica silenciosa. `schemaVersion` ja existe em
  `BuildState`; quando houver uma v2, o ponto de migracao e `parseBuildContent`,
  com um passo explicito por versao.
- Qualquer re-escrita (`updateBuild`, `duplicateBuild`, `forkBuild`) passa pelo
  caminho estrito, entao rows legadas so persistem enquanto ninguem as tocar.

Nota: `duplicateBuild` e `forkBuild` hoje copiam `source.content` direto. `fork`
copia conteudo de **outro usuario** — deve validar antes de copiar, senao um row
legado invalido se propaga para a biblioteca de quem forkou.

## Consequencias

- `package.json` + `pnpm-lock.yaml` mudam → lane serializada.
- Bundle cliente inalterado; `server-only` mantem isso garantido por build.
- Se no futuro a validacao de formulario no cliente for necessaria, esta decisao
  deve ser revisitada (opcao natural: `zod/mini` no cliente, ou extrair so os
  limites numericos/regex para um modulo isomorfico sem zod).
- O comentario enganoso em `src/db/schema.ts` passa a ser verdadeiro (AC#4).

## Adendo (ACM-069): verificacao do enforcement de `server-only`

A ACM-059 (review do PR #42) reportou que importar `buildStateSchema` num
Client Component real e rodar `next build` **passava sem erro**, o que
invalidaria a premissa do item 2 acima ("vazamento vira erro de build").
Investigacao (ACM-069) reproduziu o caso e determinou a causa raiz:

**Causa raiz: nao e um problema de configuracao do Next/Turbopack nem do
pacote `server-only`.** O comando `next build` executado diretamente no shell
interativo do ambiente de agente passa por um hook (`rtk`) que reescreve e
"compacta" a saida do comando — nesse ambiente, `next build` chegou a
retornar uma contagem de erros/warnings **identica e desconectada do estado
real do codigo** (mesmo com o pacote `server-only` ausente de
`node_modules`, ou com `next` inexistente no PATH, o wrapper ainda reportava
"Errors: 5"). Ou seja, o reviewer observou o comportamento de uma ferramenta
de shell do ambiente do agente, nao do Next.js.

Quando o build e invocado do jeito que `make check` / CI de fato invocam —
`pnpm build` (que o `package.json` mapeia para `next build`, executado como
processo filho do pnpm, fora do hook do shell interativo) — o guard
**dispara corretamente**: Turbopack recusa o build com
`Error: 'server-only' cannot be imported from a Client Component module`,
apontando exatamente `src/lib/build-schema.ts` e a cadeia de import ate o
Client Component. Verificado tambem com o pacote `server-only` fisicamente
removido de `node_modules`: o Next.js trata os nomes `server-only` /
`client-only` como caso especial embutido no bundler (independente do
conteudo do pacote no disco), entao o guard sobrevive mesmo a essa condicao.

**Exposicao medida:** inspecionado `.next/static` de um build limpo (sem
nenhum import client-side dos schemas) — nenhuma ocorrencia de `ZodError`
ou de qualquer identificador de `zod` nos chunks estaticos (896 KiB no
total). `zod` nao esta no bundle cliente hoje.

**Enforcement real, duas camadas (AC#2/#3):**

1. **Camada primaria (ja existente, confirmada funcional):** o proprio
   `server-only` via `pnpm build` no `make check` / CI. Continua sendo a
   fonte de verdade — nada foi enfraquecido em `build-schema.ts` /
   `comp-schema.ts`.
2. **Camada secundaria, nova, rapida e independente de bundler:**
   `src/__tests__/server-only-boundary.test.ts`. Um teste vitest que
   constroi estaticamente o grafo de imports de `src/` (resolvendo `@/` e
   relativos), identifica todo arquivo `"use client"` e todo arquivo
   `import "server-only"`, e falha se qualquer Client Component alcancar
   (direta ou transitivamente) um modulo server-only — respeitando a
   fronteira de `"use server"` (Server Actions nao expandem sua propria
   arvore de imports para o cliente). Roda em `pnpm test`, ja coberto por
   `make check`, sem precisar de build completo. Reproduz e falha
   corretamente o caso relatado pelo reviewer (import de
   `buildStateSchema` em `src/app/(editor)/build/new/page.tsx`).

**Conclusao:** a premissa original da decisao nao era falsa — o mecanismo
sempre funcionou no `make check`/CI real. O que faltava era um sinal visivel
e independente de peculiaridades de shell/ambiente, que agora existe como
teste dedicado.

## Adendo (ACM-071): `import type` nao e violacao de boundary

O walker de `server-only-boundary.test.ts` (adendo ACM-069 acima) tratava
qualquer import textual — inclusive `import type { X } from "@/lib/build-schema"`
— como cruzamento de fronteira. Isso e over-strict: `import type` (e
especificadores inline `type` num named import, ex.
`import { type X, y } from "..."`) e apagado inteiramente pelo TypeScript em
build time; nada do modulo server-only chega ao bundle cliente. O caso real de
exposicao e exclusivamente **import de valor**.

Regra aplicada em `extractImportSpecifiers`/`isTypeOnlyImport`: um import e
ignorado pelo walker quando (a) e `import type ... from` / `export type ... from`
inteiro, ou (b) e um named import onde **todo** especificador tem o modificador
`type` inline. Um default/namespace import, ou um named import com **pelo menos
um** especificador de valor (`import { type X, y } from "..."`), continua sendo
seguido normalmente — `y` e valor real e deve ser sinalizado se alcancar um
modulo server-only.
