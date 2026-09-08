---
id: ACM-014
title: 'Theme system — presets, background upload, controls (RF-4)'
status: To Do
assignee: []
created_date: '2026-09-07 13:33'
updated_date: '2026-09-08 01:00'
labels: []
milestone: m-3
dependencies:
  - ACM-008
  - ACM-011
ordinal: 14000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Theme panel: preset selector (dark-purple/gold/blood/ice/custom), background image upload with blur/darken/scale controls, accent color, font, show/hide item and spell names, aspect ratio.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Background upload: 4 MB max, JPEG/PNG/WebP, server-resized to max 2000px via sharp, stored as WebP
- [ ] #2 theme_json stores path not dataURL
- [ ] #3 Blur, darken, scale sliders update preview in real time
- [ ] #4 Aspect ratio: square/wide/auto changes preview wrapper dimensions
- [ ] #5 4 built-in presets apply token sets
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
GUARD LIMIT (from ACM-029 review, MEDIUM): the export-safety guard does NOT resolve CSS custom properties — a var() pointing at an oklab/oklch value in globals.css passes the guard undetected. This task introduces theme presets and colors into the capture root, so it is the most likely task to break PNG export silently. Use hex literals; if you use var() tokens, extend the guard to resolve them.

## Plano de implementacao (ACM-014)

Decisions: **decision-017** (cor no capture root), **decision-018** (storage do background), **decision-019** (contrato do tema + `theme_json`). Ler as tres antes de codar — este plano assume as tres.

### Pre-requisito de ordem
Executar **depois do merge da ACM-073** (layouts `compressed`/`list`). Ver secao "Fricao com ACM-073" no fim.

### touches
```
src/components/build-card/types.ts
src/components/build-card/tokens.ts
src/components/build-card/theme-presets.ts
src/components/build-card/BuildCard.tsx
src/components/build-card/BuildCardVertical.tsx
src/components/build-card/BuildCardGrid.tsx
src/components/build-card/BuildCardCompressed.tsx
src/components/build-card/BuildCardList.tsx
src/components/build-card/index.ts
src/components/editor/**
src/lib/theme-schema.ts
src/lib/validation-constants.ts
src/lib/uploads.ts
src/app/api/background/**
src/db/schema.ts
drizzle/0003_*.sql
drizzle/meta/**
src/actions/builds.ts
src/app/(editor)/build/page.tsx
src/app/comp/**
src/app/builds/**
src/__tests__/**
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
.env.example
```
`package.json`/`pnpm-lock.yaml`/`src/db/schema.ts` estao na lista de **serializar sempre** do CLAUDE.md — esta task nao pode rodar em paralelo com nenhuma outra que toque neles.

---

### Passo 1 — Adicionar `sharp` como dependencia direta
Arquivos: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`.

**ARMADILHA CONFIRMADA:** `sharp` hoje aparece em `pnpm-workspace.yaml` sob **`ignoredBuiltDependencies`** (e dep transitiva do Next). Adicionar como dep direta sem **mover para `onlyBuiltDependencies`** faz o pnpm continuar pulando o build script. Isso **nao quebra `make check`** (lint/tsc/build/test passam; a rota so falha em request real) — falha silenciosa em producao.

- `pnpm add sharp`
- mover `sharp` de `ignoredBuiltDependencies` para `onlyBuiltDependencies` no `pnpm-workspace.yaml`
- verificar: `pnpm install --frozen-lockfile && node -e "require('sharp')"` — tem que imprimir sem erro
- CI e `ubuntu-latest` + node 22: os pacotes prebuilt `@img/sharp-linuxmusl-x64`/`linux-x64` resolvem sozinhos, sem toolchain nativo. Confirmar que `make check` verde no CI, nao so local (macOS arm64 baixa binario diferente).

Verificavel: `make check` verde no CI **e** `node -e "require('sharp').versions"` local.

### Passo 2 — Migration 0003: `builds.theme_json` + tabela `background_images`
Arquivos: `src/db/schema.ts`, `drizzle/0003_*.sql`, `drizzle/meta/**`, teste.

- `builds.theme_json TEXT` nullable (decision-019).
- Tabela `background_images`: `id` TEXT PK (nanoid), `user_id` TEXT NOT NULL FK -> `user.id` ON DELETE CASCADE, `file_name` TEXT NOT NULL, `width` INTEGER NOT NULL, `height` INTEGER NOT NULL, `bytes` INTEGER NOT NULL, `created_at` INTEGER NOT NULL DEFAULT `(unixepoch()*1000)`. Index em `user_id`.
- Gerar com `drizzle-kit`; nao escrever SQL na mao.
- `src/db/migrate.ts` faz `foreign_key_check` pos-commit (decision-014) — rodar `pnpm test src/__tests__/db-migrate.test.ts` e confirmar que a FK nova nao dispara.

Verificavel: teste novo em `db-migrate.test.ts` (ou arquivo irmao) que aplica todas as migrations num DB temporario e assere as colunas de `background_images` + `builds.theme_json`.

### Passo 3 — Constantes compartilhadas de tema
Arquivos: `src/lib/validation-constants.ts` (+ `validation-constants.test.ts`).

Este arquivo e "values only, sem zod, sem server-only" — os controles do cliente e o schema do servidor **precisam** ler dos mesmos valores (ja houve 3 drifts registrados no header do arquivo). Adicionar:
`BG_MAX_UPLOAD_BYTES = 4 * 1024 * 1024`, `BG_MAX_DIMENSION_PX = 2000`, `BG_MAX_INPUT_PIXELS` (ver passo 5), `BG_BLUR_MIN/MAX` (0/20), `BG_DARKEN_MIN/MAX` (0/0.9), `BG_SCALE_MIN/MAX` (1/2.5), `BG_ALLOWED_MIME` (`image/jpeg`,`image/png`,`image/webp`), `THEME_PRESETS` (nomes), `ASPECT_RATIOS`, `THEME_JSON_MAX_BYTES` (2 KiB).

Verificavel: teste espelho no padrao existente do arquivo, ligando cada constante ao seu consumidor.

### Passo 4 — Contrato do tema + presets (hex literais)
Arquivos: `src/components/build-card/types.ts`, `src/components/build-card/theme-presets.ts` (novo), `src/components/build-card/tokens.ts`.

- Estender `BuildCardTheme` exatamente com o shape de decision-019. `DEFAULT_BUILD_CARD_THEME` ganha `preset: "dark-purple"`, `aspectRatio: "auto"`, `fontFamily: "sans"`, `background: null`. Os defaults de `showItemNames`/`showSpellNames` **nao mudam** (false/true).
- `theme-presets.ts`: 4 presets (`dark-purple`, `gold`, `blood`, `ice`), cada um um objeto de tokens **hex de 6 digitos** sobrescrevendo o subconjunto de `tokens.ts` que e tematizavel: `surface`, `surface2`, `border`, `fg`, `fgMuted`, `accentFallback`. `resolvePresetTokens(preset)` devolve o set completo, com fallback para os valores atuais de `tokens.ts` (que viram o preset `dark-purple`, para o default nao mudar pixel nenhum).
- `custom` = ponto fixo: resolve para os mesmos tokens do `dark-purple`; e so o marcador de "usuario editou".
- **Zero `var(--`** neste diretorio (decision-017). Darken = `rgba(0,0,0,X)` literal. Sem alpha-slash Tailwind, sem `color-mix`.

Verificavel: teste que itera os 4 presets e assere que todo valor casa `/^#[0-9a-fA-F]{6}$/`.

### Passo 5 — Camada de storage + pipeline sharp (server-only)
Arquivos: `src/lib/uploads.ts` (novo, `import "server-only"`), `.env.example`, teste.

`UPLOADS_DIR` (default `./data/uploads/backgrounds`), criado com `mkdir -p` no boot da funcao. Path do arquivo montado **so** de `nanoid()` gerado no servidor + `.webp` — **nenhuma string do cliente entra em `path.join`** (decision-018).

Pipeline `processBackgroundUpload(buffer)`:
1. sniff de **magic bytes** do buffer (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF....WEBP`) — a decisao de aceitar/rejeitar sai daqui, **nao** do `Content-Type` declarado
2. `sharp(buffer, { limitInputPixels: BG_MAX_INPUT_PIXELS, failOn: "error" })` — cap explicito de pixels (ver Seguranca)
3. `.metadata()`: rejeitar se `format` nao estiver na allowlist, se `pages > 1` (GIF/WebP animado), ou se width/height ausentes
4. `.rotate()` (aplica EXIF orientation e ja descarta metadata)
5. `.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })`
6. `.webp({ quality: 82 })` `.toBuffer()`
7. gravar com `fs.writeFile` + flag `wx` (falha se por absurdo colidir)
8. retornar `{ fileName, width, height, bytes }`

`readBackgroundFile(fileName)`: valida `fileName` contra `/^[A-Za-z0-9_-]{21}\.webp$/` **antes** de tocar o disco (defesa em profundidade, mesmo o valor vindo do DB), resolve e confirma que o path resolvido esta **dentro** de `UPLOADS_DIR` (`path.resolve` + `startsWith` com separador).

Verificavel: testes unitarios com buffers sinteticos — PNG valido passa; PNG com `Content-Type: image/svg+xml` declarado passa (o sniff manda); SVG real e rejeitado; `.exe` renomeado e rejeitado; imagem 4000px sai com lado maior = 2000; saida tem magic bytes de WebP.

### Passo 6 — `POST /api/background`
Arquivos: `src/app/api/background/route.ts`, teste.

Ordem **obrigatoria** (a ordem e o controle de seguranca, ver Seguranca):
1. `requireSession()` -> 401
2. `checkWriteRateLimit(session.user.id)` -> 429
3. checar header `Content-Length` contra `BG_MAX_UPLOAD_BYTES` -> 413 **antes de ler o body**
4. `request.formData()`, pegar o campo `file`; conferir `file.size` contra o cap -> 413 (o header e mentiravel)
5. `await file.arrayBuffer()`, reconferir `byteLength` -> 413
6. `processBackgroundUpload(buffer)` (passo 5)
7. inserir linha em `background_images` com `userId` da **sessao**, nunca do body
8. responder `{ id }` — nunca o path, nunca o filename

Sem `export const runtime = "edge"` (sharp e nativo). Rejeitar todo metodo que nao seja POST.

Verificavel: teste de rota cobrindo 401 sem sessao, 413 acima de 4 MB, 415 em tipo invalido, 200 + linha no DB no caminho feliz.

### Passo 7 — `GET /api/background/[id]`
Arquivos: `src/app/api/background/[id]/route.ts`, teste.

1. validar `id` contra `/^[A-Za-z0-9_-]{21}$/` -> 400
2. buscar a linha; ausente -> 404
3. **authz**: dono (sessao) OU o id e referenciado pelo `theme_json` de alguma build publica. Reusar/estender `src/lib/public-content.ts` para essa checagem, nao reimplementar.
4. `readBackgroundFile` -> stream com `Content-Type: image/webp`, `Cache-Control: private, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`
5. Rate limit de leitura publica: aplicar `public-read-rate-limit` no caminho nao-autenticado, igual as outras rotas publicas (decision-016).

Verificavel: teste com duas contas — user B recebe 404 no background de build privada de A, e 200 se a build de A for publica.

### Passo 8 — Schema e persistencia do `theme_json`
Arquivos: `src/lib/theme-schema.ts` (novo, `server-only`), `src/actions/builds.ts`, testes.

- `themeSchema` zod `.strict()` para o **write** (rejeita chave desconhecida, clampa faixas dos sliders), cap de `THEME_JSON_MAX_BYTES`.
- `parseThemeJson(raw)` **nunca lanca** (decision-013/019): JSON invalido ou campo fora de faixa -> `DEFAULT_BUILD_CARD_THEME`.
- Validacao de propriedade no save: se `theme.background.imageId` esta presente, confirmar que a linha existe **e pertence ao usuario da sessao** — senao 403. Sem isso um usuario referencia o upload de outro.
- `src/__tests__/server-only-boundary.test.ts` ja existe: garantir que `theme-schema.ts` nao vaze para o cliente.

Verificavel: testes de round-trip + o caso de imageId de outro usuario ser rejeitado.

### Passo 9 — BuildCard consome o tema
Arquivos: `BuildCard.tsx`, `BuildCardVertical.tsx`, `BuildCardGrid.tsx`, `BuildCardCompressed.tsx`, `BuildCardList.tsx`.

- `BuildCard` resolve `resolvePresetTokens(theme.preset)` e passa o token set adiante junto do `theme` (prop unica `tokens`), para os 4 layouts nao chamarem o resolver cada um.
- **Background renderizado como `<img>` real**, posicionado absoluto atras do conteudo — **nao** `background-image: url()` em CSS.
  Razao load-bearing: `src/lib/export-png.ts` espera cada `<img>` sob o node antes de rasterizar (`waitForImage`, `DEFAULT_IMAGE_LOAD_TIMEOUT_MS`). Um `background-image` em CSS **nao e visitado por esse guard** — o `html-to-image` buscaria a URL por conta propria e o export sairia sem background, em silencio, exatamente o modo de falha que decision-007 existe para evitar. Com `<img>` a garantia existente cobre o background de graca.
- `blur` -> `style={{ filter: "blur(Npx)" }}` no `<img>`; `scale` -> `transform: scale(N)` no `<img>`; container com `overflow: hidden`.
  O `blur` sangra a borda: compensar com `scale` minimo de `1 + blur/100` no `<img>`, senao aparece halo transparente nas bordas do PNG.
- `darken` -> div overlay com `backgroundColor: "rgba(0,0,0,X)"` literal entre o `<img>` e o conteudo.
- `aspectRatio`: `square` -> `aspect-ratio: 1/1`; `wide` -> `16/9`; `auto` -> sem constraint (comportamento atual). Aplicado no wrapper de `#capture-root`, que hoje e `display: inline-flex` — `auto` **precisa** continuar renderizando byte-identico ao atual.
- `fontFamily`: apenas fontes **same-origin** ja carregadas pelo `layout.tsx` (`--font-geist-sans`/`--font-geist-mono` via `next/font`). Nao adicionar Google Fonts por URL em runtime: o `html-to-image` teria que buscar CSS cross-origin e a fonte cairia para fallback no PNG, em silencio. Como decision-017 proibe `var()` no card, resolver o nome da familia para uma **string literal de font stack** em `theme-presets.ts`.
- `showItemNames`/`showSpellNames` passam a vir de controle real; **`list` ignora `showItemNames`** (o nome e sempre visivel por spec do doc-006) — comportamento documentado, nao bug.

Verificavel: os testes de guard existentes em `build-card.test.tsx` continuam verdes com tema completo aplicado (background + darken + os 4 presets), incluindo os 4 layouts.

### Passo 10 — Guard estendido (decision-017)
Arquivos: `src/__tests__/build-card.test.tsx` (ou `export-safety.test.ts` novo).

Duas checagens **estaticas** (leem arquivo com `fs`, nao renderizam):
1. nenhum `.ts`/`.tsx` sob `src/components/build-card/**` contem a substring `var(--`
2. `src/app/globals.css` nao contem `oklch(` nem `oklab(`

Mais: rodar os 5 guards de render existentes com um tema **completo** (preset nao-default + background + darken), nao so com o default — hoje eles so cobrem o caminho default.

Verificavel: introduzir `var(--color-accent)` de proposito num arquivo do card faz o teste falhar; reverter faz passar.

### Passo 11 — Painel de tema (UI)
Arquivos: `src/components/editor/ThemePanel.tsx` + subcomponentes, `src/app/(editor)/build/page.tsx`, testes.

- Fora do capture root (decision-010): nenhum controle interativo dentro de `#capture-root`.
- Preset selector (4 + `custom`); mexer em qualquer controle depois de aplicar um preset seta `preset: "custom"`.
- Upload: `<input type="file" accept="image/jpeg,image/png,image/webp">`; validar `file.size` no cliente **antes** do POST (UX; o servidor revalida), mostrar progresso e erro. Ao voltar `{ id }`, setar `theme.background.imageId`.
- Sliders blur/darken/scale: estado local, **preview atualiza em tempo real sem round-trip** (AC#3) — o `<img>` ja esta carregado, so mudam `filter`/`transform`/opacidade do overlay. Debounce **apenas** no autosave, nunca no render.
- Toggles de nome de item/spell, seletor de aspect ratio, seletor de fonte.
- Controles do painel **podem** usar utilitario de paleta Tailwind a vontade — a restricao de decision-017 e so dentro de `build-card/**`.

Verificavel manualmente (AC#3/#4/#5): (1) subir JPEG de ~3 MB, ver background aparecer; arrastar blur de 0 a 20 e ver o preview mudar sem flicker; (2) trocar aspect ratio square->wide->auto e ver o wrapper mudar de dimensao; (3) aplicar os 4 presets e exportar PNG de cada — todas as cores e o background presentes no arquivo baixado.

---

### Seguranca — o que o security-reviewer vai auditar
1. **Content-type real vs declarado** — a allowlist decide por **magic bytes do buffer** (passo 5.1) + `sharp.metadata().format`; o `Content-Type` do multipart e ignorado para decisao. SVG explicitamente rejeitado (vetor -> XSS se algum dia for servido inline).
2. **Path traversal** — nenhuma string do cliente chega a `path.join`. Filename = `nanoid()` do servidor. `readBackgroundFile` valida o formato do nome **e** confirma que o path resolvido esta dentro de `UPLOADS_DIR`. O `id` da rota GET e validado por regex antes de qualquer I/O.
3. **Decompression bomb / pixel flood** — `sharp(..., { limitInputPixels: N })` **explicito**, nao o default. Com o cap de 2000px de saida, `N = 50_000_000` (~50 MP) e generoso e ainda impede o classico PNG de 4 MB que descomprime para 30k x 30k. Tambem rejeitar `metadata.pages > 1` (WebP/GIF animado multiplica o custo por frame).
4. **Limite de tamanho antes de bufferizar** — checar `Content-Length` -> 413 antes de ler o body; depois `file.size`; depois `arrayBuffer().byteLength`. As tres, nessa ordem. A primeira e a barata e mentiravel; as outras duas sao as reais.
5. **Authz** — POST exige sessao e usa `session.user.id`, nunca um `userId` do body. GET so serve para o dono ou via build publica. Salvar uma build com `imageId` de outro usuario e rejeitado no passo 8. Rate limit no POST (limitador de escrita ja existente) e no GET nao-autenticado (limitador de leitura publica).
6. **Serving** — `Content-Type: image/webp` fixo, `X-Content-Type-Options: nosniff`, `Cache-Control: private` (nao `public`: proxy compartilhado nao pode cachear imagem de build privada).
7. **Quota** — sem limite por usuario, o rate limit de 30/min ainda permite ~172 MB/hora por conta. Adicionar cap de contagem por usuario (ex.: 50 backgrounds) ou registrar como task de follow-up explicita, nao deixar implicito.

---

### Fricao com ACM-073 (mesmas linhas)
A ACM-073 esta em progresso e mexe nos mesmos arquivos. Pontos de colisao literal:

- **`build-card/types.ts`** — ACM-073 nao muda `BuildCardTheme`, mas ambas editam o arquivo. Merge textual trivial se a ACM-014 so **adiciona** campos ao type e ao `DEFAULT_BUILD_CARD_THEME`. Nao reordenar o que ja existe.
- **`build-card/tokens.ts`** — ACM-073 adiciona `CARD_SLOT_EMPTY_BORDER` e `CARD_ROW_DIVIDER`. A ACM-014 precisa incluir **esses dois tambem** no token set tematizavel dos presets, senao a borda de slot vazio fica com a cor do `dark-purple` nos presets `gold`/`blood`/`ice`. **Reler `tokens.ts` no HEAD pos-merge antes de escrever `theme-presets.ts`** — a lista de tokens deste plano foi feita contra o `tokens.ts` pre-ACM-073.
- **`BuildCard.tsx`** — ACM-073 muda o union `BuildCardLayout` e o switch de render. A ACM-014 adiciona a prop `tokens` e o wrapper de aspect-ratio/background no mesmo componente e no mesmo `<div id={captureId}>`. **Colisao mais provavel do conjunto.** Fazer a ACM-014 depois, sobre o HEAD ja mergeado, nunca em worktree paralelo.
- **`BuildCardCompressed.tsx` / `BuildCardList.tsx`** — criados pela ACM-073; a ACM-014 precisa liga-los ao token set e aos toggles de nome. Nao existem ainda; nao planejar contra assinatura suposta, ler quando existirem.
- **`icons/icon-tokens.ts`** — a ACM-073 adiciona `ICON_SIZE_PX.xxs`. A ACM-014 **nao** toca este arquivo; se tocar, e sinal de que o escopo vazou.
- **`build-card.test.tsx`** — as duas adicionam casos. A ACM-014 tambem precisa rodar os guards **contra os 4 layouts**, o que so faz sentido pos-ACM-073.
<!-- SECTION:NOTES:END -->
