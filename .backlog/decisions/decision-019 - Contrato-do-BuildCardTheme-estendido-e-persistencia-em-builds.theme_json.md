---
id: decision-019
title: Contrato do BuildCardTheme estendido e persistencia em builds.theme_json
date: '2026-09-08 00:56'
status: accepted
---
## Context

Hoje `BuildCardTheme` (`src/components/build-card/types.ts`) tem so
`showItemNames`/`showSpellNames`, com comentario dizendo que a ACM-014 liga isso a
controles reais. `BuildCard` aceita `theme?: Partial<BuildCardTheme>` e faz
`{ ...DEFAULT_BUILD_CARD_THEME, ...theme }`.

Nao existe coluna `theme_json` no schema (`src/db/schema.ts`) — o AC#2 fala dela como
se existisse. `BuildState` (`src/types/build.ts`) ja carrega `accent: string` e e
persistido em `builds.content` sob cap de 128 KiB e schema `.strict()` (decision-013).

Duas escolhas independentes: (1) o **shape** do tema, (2) **onde** ele e persistido.

## Options considered

**Onde persistir — A. Dentro de `BuildState.content`.**
Sem migration. Mas `buildStateSchema` e `.strict()`: adicionar `theme` exige mexer no
schema de escrita E no read tolerante, e o `accent` passaria a existir em dois lugares
conceituais. Pior: o tema seria reenviado em todo save de build e contaria contra o cap
de 128 KiB.

**Onde persistir — B. Coluna `builds.theme_json` (TEXT, nullable).**
Uma migration `0003`. Separa apresentacao de conteudo: `content` = o que a build **e**,
`theme_json` = como ela **aparece**. Cap e schema proprios. Nullable = toda build
existente continua valida sem backfill (le como `DEFAULT_BUILD_CARD_THEME`).

**Shape — C. Tema plano (todas as chaves no nivel raiz).**
Simples de espalhar com `...`. Mas mistura 4 dominios (visibilidade, background, cor,
layout) num objeto de ~12 chaves.

**Shape — D. Tema aninhado por dominio.**
Legivel, mas quebra o `{ ...DEFAULT, ...theme }` de um nivel que `BuildCard` usa hoje:
`Partial<Theme>` com sub-objetos exige merge profundo.

## Decision

**Persistencia: opcao B** — coluna nova `builds.theme_json TEXT` nullable, migration `0003`.
`accent` **continua** em `BuildState` (nao duplicar; `resolveAccent` ja o consome). O tema
nao carrega accent.

**Shape: hibrido** — plano no topo, com **um** sub-objeto para background (que e o unico
grupo com cardinalidade propria e presenca opcional):

```
type BuildCardBackground = {
  imageId: string;          // id de background_images (decision-018)
  blur: number;             // 0..20 px
  darken: number;           // 0..0.9 (opacidade do overlay preto)
  scale: number;            // 1.0..2.5
};

type BuildCardTheme = {
  preset: "dark-purple" | "gold" | "blood" | "ice" | "custom";
  aspectRatio: "square" | "wide" | "auto";
  fontFamily: "sans" | "mono";
  showItemNames: boolean;
  showSpellNames: boolean;
  background: BuildCardBackground | null;
};
```

`BuildCard` continua recebendo `theme?: Partial<BuildCardTheme>` e faz merge **raso**.
`background` e substituicao atomica (null ou objeto completo) — nunca merge parcial. Isso
preserva a assinatura publica atual de `BuildCard` sem introduzir deep-merge.

`preset` e persistido junto: reabrir o editor precisa mostrar qual preset esta ativo, e
`"custom"` marca "o usuario mexeu depois de aplicar um preset". Os **tokens** do preset
nao sao persistidos — sao resolvidos em render por `resolvePresetTokens(preset)` em
`theme-presets.ts`. Persistir tokens congelaria a paleta e impediria ajuste de preset
depois do release.

## Consequences

- Migration `0003` adiciona coluna nullable; nao ha backfill e nenhuma leitura antiga quebra.
- Leitura tolerante obrigatoria, no mesmo espirito de decision-013: `parseThemeJson` nunca
  lanca — JSON invalido, chave desconhecida ou slider fora de range caem no default em vez
  de derrubar a pagina da build. **Diferente** do write path, que e `.strict()` e rejeita.
- `background.imageId` referencia logica sem FK (esta dentro de um TEXT). Se a linha em
  `background_images` sumir, a rota `GET` retorna 404 e o card renderiza sem background —
  degradacao silenciosa e intencional, nunca erro de render.
- Trocar preset e um `PATCH` de `theme_json` apenas, nao toca `builds.content`.
- Alterar `BuildCardTheme` obriga a atualizar `theme-schema.ts` e o default no mesmo commit;
  os dois ficam lado a lado por isso.
