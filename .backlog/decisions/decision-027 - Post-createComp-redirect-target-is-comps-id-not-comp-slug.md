---
id: decision-027
title: Post-createComp redirect target is /comps/[id], not /comp/[slug]
date: 2026-09-08
status: accepted
---

## Contexto

ACM-097 cria a rota `/comp/new` (form de uma linha: nome -> `createComp`).
O texto da task diz "redirect direto para a pagina da comp criada", mas
existem duas rotas candidatas e elas nao sao equivalentes:

- `src/app/comp/[slug]/page.tsx` — leitura **publica** por slug. Chama
  `getPublicCompBySlug`, que retorna `null` para comp sem builds
  (decision-015: "sem builds" e indistinguivel de "nao existe", para nao
  criar oraculo de existencia). A pagina entao chama `notFound()`.
  Alem disso essa rota passa pelo rate limiter por IP do `src/proxy.ts`
  (decision-016).
- `src/app/comps/[id]/page.tsx` — pagina **do dono**. Carrega via
  `getComp`/`getCompPublishState` (`requireSession()` + `loadOwnedComp`),
  e ja renderiza um estado vazio util: `CompShareStatus` com
  `state.hasNoBuilds` mostra explicitamente "a comp nao tem nenhuma build".

Uma comp recem-criada tem **zero builds** e `is_public` no default. Logo:

## Opcoes consideradas

1. **Redirect para `/comp/[slug]`** — dead-end garantido: 404 imediato
   para 100% das comps recem-criadas. Custo de estar errado: alto, quebra
   o fluxo exatamente no momento de maior intencao do usuario.
2. **Redirect para `/comps/[id]`** — pagina do dono, renderiza sem erro,
   ja comunica "sem builds". E o unico lugar onde o dono pode agir sobre a
   comp. Custo: hoje o titulo e "Compartilhar comp", entao a pagina de
   destino tem foco em share e nao em "adicionar builds" — resolvido por
   ACM-098, que deve estender exatamente essa pagina.
3. **Voltar para `/comps`** — explicitamente rejeitado pela task: devolver
   para a listagem quebra o momentum de quem esta no meio de uma tarefa.

## Decisao

`createComp` bem-sucedido navega para **`/comps/${comp.id}`**.

`/comp/[slug]` fica sendo exclusivamente a superficie publica de leitura;
o dono so deve ser mandado para la depois que a comp for de fato
alcancavel publicamente (o que `CompShareStatus` ja gerencia via link
copiavel, escondido enquanto `!isReachable`).

**ACM-098 (UI de gestao de builds do dono) deve estender
`src/app/comps/[id]/page.tsx`**, nao `/comp/[slug]`.

A navegacao e feita client-side (`router.push`) apos a action retornar,
nao via `redirect()` dentro da action: o wrapper de action precisa de um
`try/catch` para converter erros em mensagem inline, e `redirect()`
funciona lancando `NEXT_REDIRECT`, que seria engolido por esse catch.

## Consequencias

- `/comps/[id]` passa a ser a "home" de uma comp para o dono; seu titulo
  atual ("Compartilhar comp") vai precisar mudar em ACM-098.
- Nenhuma mudanca no rate limiter nem no matcher do proxy: `/comps/:path*`
  ja esta no matcher (`src/proxy.ts`), autenticado, e as actions chamam
  `requireSession()` por conta propria de qualquer forma.
- `/comp/new` continua guardado pelo proxy — AC#5 de ACM-097 (remover a
  guarda) nao se aplica, porque a rota dedicada passa a existir.
