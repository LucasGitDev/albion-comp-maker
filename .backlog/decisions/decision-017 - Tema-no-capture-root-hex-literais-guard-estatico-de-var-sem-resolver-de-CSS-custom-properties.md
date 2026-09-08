---
id: decision-017
title: >-
  Tema no capture root: hex literais + guard estatico de var(), sem resolver de
  CSS custom properties
date: '2026-09-08 00:56'
status: accepted
---
## Context

`src/components/build-card/**` e o capture root do export PNG (`#capture-root`,
decision-007/decision-010, `html-to-image`). Utilitarios de paleta do Tailwind v4
compilam para `oklch()` e utilitarios alpha-slash (`bg-black/70`) compilam para
`color-mix(in oklab, ...)`. O rasterizador baseado em foreignObject nao parseia
nenhum dos dois e **descarta a cor em silencio** — o PNG sai sem erro, so sem cor.

O guard atual vive em `src/__tests__/build-card.test.tsx` e faz 5 checagens sobre
a arvore *renderizada*:
1. nenhum className de paleta (`PALETTE_COLOR_UTILITY`)
2. nenhum className alpha-slash (`ALPHA_SLASH_UTILITY`)
3. `innerHTML` sem `oklch(`
4. `innerHTML` sem `color-mix(` / `oklab(`
5. nenhum atributo `style` inline com esses tres

Buraco conhecido (achado MEDIUM da review da ACM-029, registrado nas notas da
ACM-014): **o guard nao resolve CSS custom properties**. Um
`style={{ color: "var(--color-accent)" }}` passa em todas as 5 checagens; se
`--color-accent` em `globals.css` (hoje, ou depois de um refactor de tema) apontar
para `oklch()`/`oklab()`, o export quebra sem nenhum sinal. Em jsdom
`getComputedStyle` nao resolve a cascata do Tailwind, entao aumentar o guard "de
verdade" exigiria carregar e resolver o CSS gerado.

A ACM-014 e a task de maior risco aqui: e a primeira que introduz **cor escolhida
pelo usuario** (accent), **4 presets de paleta** e um **overlay de escurecimento
com alpha** dentro do capture root.

## Options considered

**A. Hex literais em toda a superficie de tema + guard estatico de fonte.**
Presets e tokens de tema ficam em `src/components/build-card/theme-presets.ts` como
strings hex de 6 digitos, no mesmo modelo do `tokens.ts` atual. O accent do usuario
ja e validado por `ACCENT_HEX_PATTERN` (`/^#[0-9a-fA-F]{6}$/`, `validation-constants.ts`).
Alpha (darken overlay) usa `rgba(0,0,0,X)` literal — funcao antiga, suportada pelo
rasterizador, e nao casa com nenhum dos padroes proibidos.
Guard ganha **duas checagens estaticas** (leitura de arquivo, sem CSS engine):
- nenhum arquivo `.ts`/`.tsx` sob `src/components/build-card/**` contem a substring `var(--`
- `src/app/globals.css` nao contem `oklch(` nem `oklab(`
Custo: ~25 linhas de teste.

**B. Estender o guard para resolver `var()`.**
Parsear `globals.css`, montar mapa nome→valor, resolver a indirecao do bloco
`@theme inline` (que aliasa `--color-X: var(--X)`), e reescrever recursivamente cada
`var()` encontrado no markup renderizado antes de aplicar os regexes.
Custo: parser de CSS artesanal (ou dependencia nova), resolucao recursiva com
deteccao de ciclo, tratamento de fallback `var(--x, #fff)`, e ainda assim **nao**
cobre valores que so existem no CSS gerado pelo Tailwind (utilitarios), so os que
estao no `globals.css` fonte.

**C. Nao fazer nada e confiar em revisao humana.**
Custo zero agora; ja falhou uma vez (ACM-029 encontrou o bug de alpha-slash *depois*
do merge da ACM-013).

## Decision

**Opcao A.** Regra dura mantida e ampliada: dentro de `src/components/build-card/**`
toda cor e **literal** — hex de 6 digitos vindo de `tokens.ts`/`theme-presets.ts`, ou
`rgba()` literal para alpha. **`var(--...)` e proibido por completo nesse diretorio**,
inclusive para valores que hoje sao hex seguros em `globals.css`.

Proibir `var()` inteiro, em vez de proibir "`var()` que resolve para oklch", e o que
torna o guard barato: nao precisamos saber para onde o `var()` aponta se ele nunca
pode existir. A checagem vira grep de substring em arquivos-fonte.

A segunda checagem (`globals.css` sem `oklch(`/`oklab(`) e defesa em profundidade
para o resto do app, que **pode** usar `var()` livremente por estar fora do capture
root — ela impede que alguem "modernize" a paleta global para oklch e quebre um
`var()` que tenha escapado.

Cores de tema **nao** entram em `globals.css` nem no bloco `@theme` — mesmo criterio
que `tokens.ts` ja documenta.

## Consequences

- Presets e background/darken/accent vivem em modulo TS proprio, versionado junto do
  card. Trocar preset e trocar objeto, nao recompilar CSS.
- O accent do usuario ja chega validado como hex de 6 digitos pelo schema de escrita;
  nao ha caminho para uma cor arbitraria (`hsl()`, nome CSS, `oklch()`) entrar no card.
- Perdemos a possibilidade de tematizar o card via `:root` custom properties e
  troca de classe. Custo aceito: o card e prop-driven por design (decision-010) e
  precisa renderizar identico fora do browser (Satori/servidor), onde a cascata do
  `globals.css` nao existe de qualquer forma.
- O buraco fica **fechado por construcao, nao por deteccao**. Se no futuro alguem
  precisar de `var()` no card (ex.: dark/light real), a decisao precisa ser revisitada
  e ai sim a opcao B vira obrigatoria.
- O guard novo e estatico: le arquivos com `fs`, nao renderiza. Roda em milissegundos
  e nao depende de jsdom.
