---
id: ACM-066
title: Adicionar comps.is_public e UX de porque o link publico da comp esta morto
status: Done
assignee: []
created_date: '2026-09-07 20:32'
updated_date: '2026-09-09 02:44'
labels: []
dependencies: []
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Vem da decision-015 (ACM-021) e do finding HIGH da review. Hoje comps NAO tem coluna is_public: a ACM-021 definiu que uma comp so e publicamente alcancavel se TODAS as suas builds forem publicas e validas; caso contrario a comp inteira retorna 404. Isso e correto do ponto de vista de seguranca (nenhuma build privada vaza, nenhuma renderizacao parcial revela a estrutura da comp) e a auditoria confirmou que nao ha caminho de render parcial. O PROBLEMA e de produto: o dono compartilha o link no Discord, o link morre, e NADA no app explica o motivo. A proposta de valor inteira do produto e compartilhar comp para o Discord — falhar em silencio exatamente ai e o pior lugar possivel. Duas partes: (1) avaliar adicionar comps.is_public como flag explicita em vez de derivar das builds; (2) independente disso, o dono precisa ver, na propria comp, quais builds estao privadas e portanto quebrando o link publico.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Decidido e documentado se comps ganha is_public explicito ou continua derivando das builds
- [ ] #2 O dono ve quais builds tornam a comp inalcancavel publicamente, antes de compartilhar
- [ ] #3 Nenhuma regressao de seguranca: build privada continua sem vazar, sem render parcial, sem oraculo de existencia
- [ ] #4 Se houver migracao, testada contra banco NAO-VAZIO com linhas referenciando (ver ACM-018/050)
- [ ] #5 make check verde
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Decisao: decision-025 (ler ANTES de codar, junto com decision-015 e decision-014)

`comps` ganha `is_public` explicito, mas como **AND-gate** sobre a regra
derivada de decision-015. Alcancavel publicamente sse:

`comp.is_public == true` **E** comp tem >= 1 build **E** toda build de
`comp_builds` e `is_public` **E** o `content` de toda build passa
`parseBuildContent`.

O flag so restringe, nunca amplia. Nenhuma build privada fica legivel por
caminho novo. Nenhum estado novo distinguivel na resposta publica: tudo
continua `notFound()`.

## Passos

1. **Schema** — em `src/db/schema.ts`, na tabela `comps`, adicionar
   `isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false)`
   posicionado depois de `contentType`, com comentario apontando para
   decision-025. Verificavel: `npx drizzle-kit generate` produz diff so dessa coluna.

2. **Migracao `drizzle/0004_add_comp_is_public.sql`** (gerar com drizzle-kit e
   depois editar o SQL a mao, como 0001/0002 fizeram). Duas statements:

   ```sql
   ALTER TABLE `comps` ADD `is_public` integer DEFAULT false NOT NULL;
   --> statement-breakpoint
   UPDATE `comps` SET `is_public` = true
   WHERE EXISTS (SELECT 1 FROM `comp_builds` WHERE `comp_builds`.`comp_id` = `comps`.`id`)
     AND NOT EXISTS (
       SELECT 1 FROM `comp_builds`
       JOIN `builds` ON `builds`.`id` = `comp_builds`.`build_id`
       WHERE `comp_builds`.`comp_id` = `comps`.`id` AND `builds`.`is_public` = false
     );
   ```

   Pontos obrigatorios:
   - **Nao** usar rebuild (`CREATE __new_comps` / `DROP TABLE`). SQLite aceita
     `ADD COLUMN ... NOT NULL` com default **constante** (`false` = 0). Como
     nao ha `DROP TABLE`, `pendingMigrationsNeedFkOff` em `src/db/migrate.ts`
     retorna false e o batch roda com FK ON, dentro da transacao do migrator —
     nada a mudar em `migrate.ts`. Se voce se pegar escrevendo `DROP TABLE`
     aqui, parou: esta errado.
   - O backfill preserva links ja compartilhados: so marca publicas as comps
     que JA eram alcancaveis pela regra derivada. Comp sem builds ou com
     qualquer build privada fica 0.
   - Atualizar `drizzle/meta/_journal.json` + snapshot (drizzle-kit faz).
   - Escrever o comentario `--` no topo do .sql explicando por que nao ha
     rebuild, no mesmo estilo de 0001/0002.

3. **Action `toggleCompPublic(id)`** em `src/actions/comps.ts`, espelhando
   `toggleBuildPublic` (`src/actions/builds.ts:249`): `requireSession()` ->
   `checkWriteRateLimit` -> `loadOwnedComp` -> `UPDATE ... WHERE id = ? AND
   user_id = ?` (o `userId` **tem** que estar no WHERE do update, nao so na
   leitura previa — TOCTOU) -> `CompNotFoundError` se nao retornar linha.
   Tambem incluir `isPublic` implicitamente em `CompRow` (vem de
   `$inferSelect`, nada a fazer).

4. **`getPublicCompBySlug`** em `src/lib/public-content.ts`: apos carregar a
   comp, `if (!comp || !comp.isPublic) return null;`. Nao mexer em nada mais
   do fluxo — as checagens de build privada / content invalido continuam
   identicas. Atualizar o docblock citando decision-025.
   (ACM-064 quer mover `is_public` para o WHERE do SQL; **nao** faca isso
   aqui, e outra task — apenas nao crie conflito estrutural.)

5. **Leitura de dono `getCompPublishStatus(compId)`** — novo modulo
   `src/lib/comp-publish-status.ts` (`import "server-only"`), chamado a
   partir de uma action owner-scoped em `src/actions/comps.ts`
   (`getCompPublishState(compId)`), que faz `requireSession()` +
   `loadOwnedComp` ANTES de qualquer leitura. Retorna:

   ```ts
   type CompPublishState = {
     isPublic: boolean;          // a flag
     isReachable: boolean;       // flag AND regra derivada
     hasNoBuilds: boolean;
     blockers: Array<{
       compBuildId: string;
       position: number;
       buildId: string;
       buildName: string;
       reason: "private-own" | "private-foreign" | "invalid-content";
       ownedByMe: boolean;
     }>;
   };
   ```

   `reason`: build privada do proprio dono da comp = `private-own`
   (acionavel, tem botao "Tornar publica"); build privada de outro usuario =
   `private-foreign` (so "Remover do comp"); `parseBuildContent` falhando =
   `invalid-content` ("Reabrir a build no editor e salvar").
   Nunca expor `content`/`theme_json` de build alheia aqui — apenas
   `buildName`, e so porque a comp ja e do requisitante e ele ja adicionou
   essa build (decision-025, ultima consequencia).

6. **Rota de dono `/comps`** — `src/app/comps/page.tsx` (server component),
   espelhando `src/app/builds/page.tsx`: `listMyComps()` dentro de try/catch
   com `redirect("/")` no catch (a action e a fronteira real, o proxy e UX).
   Para cada comp mostra nome, contentType, e um badge de estado com tres
   valores possiveis:
   - `Privada` (is_public false)
   - `Link publico ativo` (is_public true e reachable)
   - `Link publico quebrado` (is_public true, nao reachable) — em cor de
     alerta, com a contagem de blockers.
   Evitar N+1 gritante: uma unica query agregada por usuario para os
   contadores do badge (join `comps`/`comp_builds`/`builds` com
   `COUNT(*) FILTER`-equivalente via `SUM(CASE WHEN ...)`); o detalhamento
   por blocker so na pagina de detalhe.

7. **Rota de detalhe `src/app/comps/[id]/page.tsx`** + componente
   `src/components/comp/CompShareStatus.tsx` (client, `"use client"`), que
   recebe o `CompPublishState` por props e renderiza:
   - toggle "Comp publica" chamando `toggleCompPublic`;
   - o link publico `/comp/<slug>` com botao copiar, **apenas quando
     `isReachable`**; quando `isPublic && !isReachable`, no lugar do link,
     um painel de alerta: "Este link nao vai abrir para ninguem. N builds
     estao privadas:" + lista dos blockers com o motivo e a acao cabivel;
   - botao por blocker `private-own` chamando `toggleBuildPublic(buildId)`
     seguido de `revalidatePath`.
   Copy em pt-BR (o app hoje e pt-BR hardcoded; nao introduzir i18n aqui —
   fora de escopo, ACM-023).

8. **Proxy** — em `src/proxy.ts`, adicionar `"/comps/:path*"` ao `matcher`
   e garantir que ele caia no ramo autenticado (`auth(handler)`), nunca no
   ramo publico. Cuidado: a regex de segmento unico existente cobre
   `/comp/:slug`; `/comps` e outro prefixo e nao pode ser confundido com ela.
   **Conflito de arquivo:** ACM-077 tambem toca `src/proxy.ts` — serializar
   com ela, nao rodar em paralelo.

9. `make check` verde. Depois rodar os 3 passos manuais abaixo.

## Verificacao manual (obrigatoria, DoD item 3)

1. Criar comp com 2 builds, uma privada. Marcar a comp como publica em
   `/comps/<id>`. Esperado: painel vermelho listando exatamente a build
   privada, sem link copiavel; abrir `/comp/<slug>` em janela anonima ->
   404.
2. Clicar "Tornar publica" na build listada. Esperado: painel vira verde, o
   link aparece, `/comp/<slug>` anonimo renderiza as 2 builds.
3. Desmarcar "Comp publica". Esperado: `/comp/<slug>` anonimo volta a 404
   mesmo com todas as builds publicas; a pagina publica de cada build
   individual continua acessivel.

## Nenhuma regressao de seguranca (AC#3)

- O conjunto de comps alcancaveis apos a mudanca e **subconjunto** do atual:
  a unica alteracao na query publica e uma condicao a mais em AND.
- Sem render parcial: `getPublicCompBySlug` continua com `return null` no
  primeiro blocker, antes de montar `entries`.
- Sem oraculo: `/comp/[slug]` continua com `notFound()` unico para
  inexistente / nao publicada / build privada / content invalido. Nao
  introduzir status code, header, `metadata` ou mensagem diferente por caso.
- Toda a UX de diagnostico vive atras de `requireSession()` + `loadOwnedComp`
  em `/comps/**`, nunca em `/comp/[slug]`. Nao adicionar NADA a
  `src/app/comp/[slug]/page.tsx` — nem "voce e o dono, este link esta
  quebrado": isso exigiria ler sessao na rota publica e criaria justamente o
  oraculo (resposta variando por identidade do requisitante).
- `toggleCompPublic` e `getCompPublishState` nunca aceitam `userId` do
  caller; ambos filtram por `session.user.id` no proprio statement.

## Testes a escrever

- `src/__tests__/db-migrate.test.ts` (estender): banco **NAO-VAZIO** semeado
  no schema 0003 com (a) comp com 2 builds publicas, (b) comp com 1 publica
  + 1 privada, (c) comp sem builds, (d) comp de outro usuario. Aplicar 0004.
  Assertions: nenhuma linha de `comps`/`comp_builds`/`builds` perdida;
  `is_public` = 1 so em (a); `PRAGMA foreign_key_check` vazio; e que o SQL de
  0004 **nao** contem `DROP TABLE` (guard textual — protege contra alguem
  regenerar a migracao com drizzle-kit e reintroduzir o rebuild).
- `src/__tests__/public-content.test.ts` (estender): comp com todas as builds
  publicas mas `is_public = false` -> `null`; `is_public = true` + todas
  publicas -> comp completa; `is_public = true` + uma privada -> `null`;
  `is_public = true` + content invalido -> `null`.
- `src/__tests__/comps-actions.test.ts` (estender): `toggleCompPublic`
  alterna; nao-dono recebe `CompNotFoundError` (mesma forma de comp
  inexistente); rate limit aplicado; `getCompPublishState` classifica os
  quatro casos de `reason` e marca `ownedByMe` corretamente; nao-dono nao
  consegue le-lo.
- `src/__tests__/comp-share-status.test.tsx` (novo): estado quebrado nao
  renderiza o link publico nem o botao copiar; lista os blockers com o texto
  do motivo; estado ok renderiza o link; blocker `private-foreign` nao
  oferece "Tornar publica".
- `src/__tests__/public-pages.test.tsx` (estender): `/comp/[slug]` com comp
  nao publicada chama `notFound()`, indistinguivel do caso slug inexistente.

## touches

```
src/db/schema.ts
drizzle/0004_*.sql
drizzle/meta/**
src/actions/comps.ts
src/lib/public-content.ts
src/lib/comp-publish-status.ts
src/app/comps/**
src/app/comp/[slug]/page.tsx
src/components/comp/**
src/proxy.ts
src/__tests__/db-migrate.test.ts
src/__tests__/public-content.test.ts
src/__tests__/public-pages.test.ts
src/__tests__/public-pages.test.tsx
src/__tests__/comps-actions.test.ts
src/__tests__/comp-share-status.test.tsx
src/__tests__/server-only-boundary.test.ts
```

**Serializar com:** ACM-064 (`src/lib/public-content.ts`), ACM-077
(`src/proxy.ts`). Nao rodar em paralelo com nenhuma task que toque
`src/db/schema.ts` ou `drizzle/**`.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Plano e decisao registrados por architect (2026-09-08). decision-025 define comps.is_public como AND-gate sobre a regra derivada de decision-015. Ver campo Implementation Plan.

Auditoria de seguranca (security-reviewer, read-only) — SHA auditado: aebae86 (origin/task/66-comp-is-public, HEAD no momento da auditoria).

Veredito: LGTM (nao bloqueia merge). Nenhum finding CRITICAL ou HIGH.

1. Nao-ampliacao (src/lib/public-content.ts): getPublicCompBySlug exige comp.isPublic AND every referenced build.isPublic AND parseBuildContent ok para cada build, AND rows.length>0. Nao ha caminho onde is_public=1 sozinho sirva conteudo privado. Confirmado correto.

2. Oraculo de existencia (src/app/comp/[slug]/page.tsx): getPublicCompBySlug retorna null uniformemente para slug inexistente, comp privada, comp sem builds, e comp com qualquer build privada/invalida. Pagina so tem um notFound(). Sem oraculo.

3. Authz/IDOR (src/actions/comps.ts): toda leitura (getComp, listMyComps, listMyCompsWithStatus, getCompPublishState) chama requireSession() e filtra por userId antes de qualquer leitura de detalhe. loadOwnedComp lanca o mesmo CompNotFoundError tanto para id inexistente quanto para id de outro usuario (sem distincao). addBuildToComp verifica ownership do build referenciado (own OR public) antes do insert.

4. toggleCompPublic: chama loadOwnedComp antes do UPDATE, e o proprio UPDATE tambem filtra por userId (defesa contra TOCTOU). CSRF: protegido pelo mecanismo padrao de Server Actions do Next (POST com Origin check do framework); nao aceita userId do caller.

5. Blocker list (src/lib/comp-publish-status.ts): reason "private-foreign" revela buildName + buildId de build de outro usuario ao dono da comp. Risco residual BAIXO/informativo: addBuildToComp so permite adicionar builds publicas ou proprias, entao o dono ja conhecia esse buildName no momento em que adicionou; o unico dado "novo" e o nome atual (caso o dono estrangeiro tenha renomeado apos tornar a build privada). Nao expoe content/theme_json. Recomendacao nao bloqueante: considerar omitir buildName quando reason=private-foreign, exibindo so a posicao, para minimizar exposicao ainda mais.

6. src/proxy.ts: PUBLIC_READ_PATHS regex (/^\/(build|comp)\/[^/]+\/?$/) NAO casa com /comps ou /comps/:id (plural), entao essas rotas caem no branch autenticado (authProxy) via matcher. Confirmado que /comps nao esta exposto anonimamente. (Nota: middleware e so UX segundo comentario do proprio codigo; as actions sao a boundary real, o que foi confirmado no item 3.)

7. drizzle/0004_add_comp_is_public.sql: ALTER TABLE ADD COLUMN com DEFAULT constante — sem DROP TABLE/rebuild, sem acionar caminho FK-off. Backfill so marca is_public=1 para comps que ja tinham >=1 build e nenhum build privado (regra derivada de decision-015) — nao amplia reachability pre-existente.

Nenhum finding bloqueante. Um item informativo (LOW) no ponto 5 acima, nao bloqueia merge.

Review de código (não-segurança) do PR #63 — SHA auditado: aebae86 (origin/task/66-comp-is-public, confirmado como HEAD real via git fetch, CI green em statusCheckRollup do PR).

Achados:

1. [INFO/OK] AC#4 migração: src/__tests__/db-migrate.test.ts cobre exatamente os 4 casos do plano (all-public, mista, sem builds, de outro usuário) contra schema 0003 não-vazio, aplica 0004, assere zero perda de linhas (pré/pós COUNT), foreign_key_check vazio, backfill correto por comp (comp-all-public=1, comp-mixed=0, comp-empty=0, comp-other-user=1) e guard textual contra DROP TABLE/__new_comps (com strip de comentários, não dá falso-positivo no próprio comentário explicativo). Nenhuma fraqueza encontrada — teste testa comportamento, não implementação.

2. [INFO/OK] Backfill SQL (0004): EXISTS build AND NOT EXISTS build privada — lido de perto, semântica bate exatamente com decision-025 e com o comportamento asserido pelo teste. Sem off-by-one.

3. [INFO/OK] AC#2 UX: CompShareStatus.tsx renderiza os 3 estados de blocker (private-own com botão "Tornar pública", private-foreign sem botão, invalid-content com texto explicativo) e esconde o link+botão copiar quando isPublic && !isReachable, substituindo por painel de alerta. Confere com decision-025 e com o plano.

4. [INFO/OK] src/types/comp-publish-status.ts fora de `touches`: justificativa procede. server-only-boundary.test.ts é um scanner genérico de grafo de imports (não precisou ser editado — diff vazio nesse arquivo) que already cobriria a violação se CompShareStatus.tsx importasse comp-publish-status.ts diretamente (que tem `import "server-only"`). Extrair os tipos para um módulo plano é o padrão correto e mínimo necessário.

5. [INFO/OK] Header.tsx: diff é exatamente 1 linha adicionada (novo item em NAV_LINKS apontando /comps). Nada mais tocado — confirmado via `git diff origin/main...origin/task/66-comp-is-public -- src/components/layout/Header.tsx`. Conflito com ACM-093 deve ser trivial (single-line insert).

6. [LOW] src/__tests__/auth-middleware.test.ts foi modificado (não está em `touches`) para cobrir o novo matcher `/comps/:path*` caindo no ramo autenticado. É a extensão natural/esperada de tocar `src/proxy.ts` (que está em touches) e não há teste dedicado a proxy.ts fora desse arquivo — considero desvio de escopo aceitável e não bloqueante, mas o implementer deveria ter declarado essa adição na nota de desvio junto com a de comp-publish-status.ts, não deixar implícita.

7. [LOW] src/app/comps/[id]/page.tsx chama getComp(id) e getCompPublishState(id) em paralelo (Promise.all), cada uma rodando seu próprio requireSession()+loadOwnedComp — 2x round-trips de auth/ownership redundantes por render. Não é bug (ambas as chamadas são owner-scoped e consistentes), é só uma duplicação de trabalho; dívida técnica menor, não bloqueia.

Não avaliei: aspectos de segurança (não-ampliação, oráculo, IDOR) — delegado ao security-reviewer em paralelo, conforme instrução.

Veredito: LGTM (nenhum finding CRITICAL ou HIGH). Achados 6 e 7 são LOW, registrados como dívida, não bloqueiam merge.

ORCHESTRATOR - fechamento.

Duas revisoes independentes, ambas com SHA FIXADO em aebae86 (pratica adotada depois do falso positivo da ACM-092):
- security-reviewer: LGTM, zero CRITICAL/HIGH/MEDIUM. Confirmou nao-ampliacao (getPublicCompBySlug exige isPublic AND todas as builds publicas AND conteudo valido AND >=1 build), nao-oraculo (notFound() unico; slug inexistente, comp privada, build privada e conteudo invalido colapsam no mesmo null), e authz (loadOwnedComp lanca o MESMO CompNotFoundError para inexistente e para comp de outro dono; toggleCompPublic reforca userId no WHERE do UPDATE como defesa TOCTOU).
- reviewer: LGTM, zero CRITICAL/HIGH. Teste de migracao cobre os 4 casos exigidos pelo AC#4 contra schema 0003 nao-vazio com pre/pos COUNT, foreign_key_check vazio e guard anti-DROP TABLE (com strip de comentarios evitando falso-positivo no proprio comentario explicativo).

Verificacao independente minha (nao por relato de agent): migracao e ALTER TABLE ADD COLUMN com default constante, sem rebuild; backfill EXISTS build AND NOT EXISTS build privada; Header.tsx alterado em exatamente 1 linha.

MERGE: PR #63 mergeado (commit 4800e47). make check verde na main pos-merge.

LOWs NAO resolvidos, promovidos a follow-up em vez de travar o merge:
1. private-foreign expoe buildName/buildId de build de outro usuario ao dono da comp. Mitigado na pratica (addBuildToComp so aceita build publica ou propria, entao o dono ja conhecia o nome ao anexar); dado novo possivel e so um rename posterior. Nao expoe content nem theme_json.
2. /comps/[id] roda requireSession()+loadOwnedComp duas vezes (getComp + getCompPublishState) — divida tecnica, nao bug.
3. auth-middleware.test.ts foi tocado fora da lista touches sem nota de desvio (extensao natural de tocar proxy.ts, mas deveria ter sido declarada).

Desvio aceito e justificado: src/types/comp-publish-status.ts criado fora do touches original porque server-only-boundary.test.ts bloqueia Client Component de importar ate 'import type' de modulo server-only. Justificativa conferida pelo reviewer contra o proprio teste de fronteira.
<!-- SECTION:NOTES:END -->
