---
id: decision-025
title: 'comps.is_public explicito como AND-gate sobre a regra derivada das builds'
date: '2026-09-08 00:00'
status: accepted
---
## Contexto

decision-015 (ACM-021) definiu que `comps` nao tem coluna de visibilidade:
uma comp e publicamente alcancavel sse tiver ao menos uma build e TODAS as
builds referenciadas por `comp_builds` forem `is_public` com `content` que
passa `parseBuildContent`. Qualquer build privada ou invalida derruba a comp
inteira para `notFound()`, sem render parcial e sem oraculo de existencia
(`src/lib/public-content.ts::getPublicCompBySlug`).

A auditoria de seguranca confirmou que a regra e correta. O problema e de
produto: o dono cola o link no Discord, o link retorna 404, e nada no app
explica o motivo. Compartilhar comp no Discord e a proposta de valor central
do produto — falhar em silencio exatamente nesse ponto e o pior lugar
possivel. Alem disso, hoje nao existe:

- nenhuma nocao de "publicar" uma comp (a comp vira publica como efeito
  colateral de o dono publicar builds individualmente, possivelmente por
  outro motivo);
- nenhuma forma de despublicar uma comp sem tornar privada pelo menos uma
  build (o que despublica tambem a pagina daquela build).

## Opcoes consideradas

**A. Manter derivado (status quo), so adicionar UX.**
Zero migracao, zero risco de divergencia flag-vs-realidade, fail-closed por
construcao. Mas mantem os dois furos semanticos acima: publicar uma build por
qualquer motivo pode tornar publica uma comp que o dono nunca quis publicar
(publicacao implicita, sem consentimento explicito), e nao ha botao de
"despublicar comp". Barato, mas nao resolve a semantica.

**B. `comps.is_public` substituindo a regra derivada (comp publica torna
suas builds renderizaveis publicamente).**
Da controle total ao dono e um "publicar" de verdade. Mas e uma regressao de
seguranca direta: o conteudo de uma build privada passaria a ser servido a
anonimos por um caminho lateral, e a visibilidade de `builds.is_public`
deixaria de ser a unica verdade sobre aquela build. Um unico bug de escopo
na query publica vaza build privada. Rejeitada.

**C. `comps.is_public` como AND-gate sobre a regra derivada (escolhida).**
`reachable = comp.is_public AND comp tem >=1 build AND todas as builds sao
is_public e validas`. O flag so pode restringir, nunca ampliar.

## Decisao

Opcao C. `comps` ganha `is_public integer NOT NULL DEFAULT false`, com
`toggleCompPublic` espelhando `toggleBuildPublic`, e
`getPublicCompBySlug` passa a exigir `comp.is_public` ALEM de todas as
condicoes que ja exige hoje. A regra derivada de decision-015 continua
valendo integralmente — este ADR a estende, nao a substitui.

Consequencias de seguranca: nenhuma. O conjunto de comps alcancaveis apos
esta mudanca e um subconjunto do conjunto atual. Nenhuma build privada passa
a ser legivel por nenhum caminho novo; nenhuma resposta nova distingue
"nao existe" de "privada" de "conteudo invalido" — tudo continua sendo o
mesmo `notFound()`.

Semantica de "publicar": `comps.is_public` e **intencao de compartilhar**,
nao garantia de alcancabilidade. As duas coisas podem divergir (comp marcada
publica contendo build privada = link morto), e essa divergencia e
exatamente o estado que a UX desta task precisa tornar visivel ao dono. O
flag nao e cache do estado derivado e nunca deve ser sincronizado
automaticamente a partir das builds — nao existe backfill/trigger mantendo
os dois em acordo, logo nao existe risco de cache stale. A unica leitura que
combina os dois e a query publica, que recomputa o estado derivado toda vez.

Backfill: a migracao marca `is_public = 1` apenas para comps que ja sao
publicamente alcancaveis hoje pela regra derivada (tem >=1 build e nenhuma
build privada). Isso preserva links ja compartilhados no Discord sem tornar
publica nenhuma comp que ja nao fosse. Todas as demais ficam em 0.
Validacao de `content` nao entra no backfill (SQL nao roda
`parseBuildContent`); isso e conservador na direcao segura apenas em parte —
uma comp com build de content invalido pode receber `is_public = 1`, mas
continua 404 porque a regra derivada em runtime a rejeita.

## Consequencias

- Migracao `0004`: `ALTER TABLE comps ADD is_public integer DEFAULT false
  NOT NULL` (SQLite aceita ADD COLUMN NOT NULL com default constante — sem
  rebuild, sem DROP TABLE, logo sem o caminho FK-off/backup de
  decision-014) + um `UPDATE` de backfill.
- `getPublicCompBySlug` ganha uma condicao a mais; nenhuma condicao existente
  e relaxada.
- Novo estado de produto observavel: "publicada mas com link morto". A UX de
  ACM-066 existe justamente para esse estado.
- A pagina de dono da comp mostra quais builds quebram o link. Isso e
  informacao do proprio dono sobre as proprias comps, atras de
  `requireSession()` — nao e oraculo.
- Uma comp pode conter build publica de OUTRO usuario (`addBuildToComp`
  aceita build publica alheia). Se o dono dessa build a tornar privada, o
  link da comp morre e o dono da comp nao pode consertar sozinho. A UI deve
  distinguir "sua build privada" (acionavel) de "build de outro usuario nao
  mais publica" (nao acionavel: remover ou forkar).
