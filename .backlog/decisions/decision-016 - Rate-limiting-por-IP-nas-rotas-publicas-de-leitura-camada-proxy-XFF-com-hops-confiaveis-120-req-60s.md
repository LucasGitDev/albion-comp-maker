---
id: decision-016
title: >-
  Rate limiting por IP nas rotas publicas de leitura: camada proxy, XFF com
  hops confiaveis, 120 req/60s
date: '2026-09-07'
status: accepted
---

## Contexto

`src/lib/rate-limit.ts` (ACM-018, eviction LRU corrigida na ACM-051) e keyed em
`session.user.id` e so e chamado no topo de Server Actions de escrita. As paginas
publicas SSR `/build/[slug]` e `/comp/[slug]` (ACM-021) sao a primeira superficie
anonima do produto: ambas declaram `export const dynamic = "force-dynamic"`, entao
cada request faz query no SQLite e renderiza o card server-side. Nao ha nenhum
throttle nesse caminho.

O vetor nao e enumeracao de slug (`nanoid(8)` tem entropia suficiente), e sim
scraping/hammering de slugs ja conhecidos — um link no Discord e publico por
definicao.

Restricoes existentes:
- decision-001/002/006: SQLite single-node. Nao existe Redis nem plano de escala
  horizontal no v1.
- decision-012: `src/proxy.ts` (convencao Next.js 16) roda sempre no runtime
  Node.js; declarar `runtime` no `config` e erro de build. O proxy hoje e
  `export default auth(handler)` com matcher allow-list `["/builds/:path*", "/comp/new"]`,
  deliberadamente nao-global para que rotas nao protegidas nao paguem o lookup de
  sessao no banco.
- decision-013 / ACM-021: as paginas publicas nao podem ser um oraculo de
  existencia — `getPublicBuildBySlug`/`getPublicCompBySlug` ja colapsam
  "inexistente", "privado" e "conteudo invalido" no mesmo `null` -> `notFound()`.

## Opcoes consideradas

### 1. Camada onde aplicar o limite

**A. Dentro do Server Component de cada pagina.**
Simples e sem mexer no proxy. Rejeitado por dois motivos. Primeiro, o codigo roda
*depois* da resolucao de rota e naturalmente depois do lookup: a ordem obvia
(`getPublicBuildBySlug` -> `notFound()` ... e o throttle onde?) produz um oraculo —
slug inexistente responde 404, slug existente responde 429. Garantir a ordem
correta viraria uma invariante fragil replicada em duas paginas. Segundo, o custo
que queremos evitar (query + render) ja foi parcialmente pago.

**B. No proxy (`src/proxy.ts`), antes de qualquer acesso a dados. ESCOLHIDA.**
Ponto unico de estrangulamento, roda antes do route handler, e — crucialmente — o
proxy *nao conhece o slug*, so o pathname. A ausencia de oraculo passa a ser
estrutural, nao uma invariante de ordenacao que alguem pode inverter num refactor.
Runtime Node garantido, mesmo processo, entao o `Map` em memoria e compativel.

**C. Reverse proxy externo (nginx/Cloudflare).**
Tecnicamente superior (nem chega ao Node). Rejeitado para v1 porque nao ha
infraestrutura de deploy definida e a defesa nao pode depender de configuracao que
o repositorio nao versiona. Nao e mutuamente exclusivo: se um dia existir, este
limiter vira segunda linha barata.

### 2. Estado em memoria

Aceito para v1, com a mesma limitacao ja documentada em `rate-limit.ts`: o estado
reseta em restart/redeploy e nao e compartilhado entre workers. O projeto e
single-node SQLite (decision-006); rodar N workers Node ja quebraria outras
premissas antes de quebrar esta. Consequencia registrada: se algum dia houver
mais de um processo, este limiter e o de escrita precisam ir juntos para um store
compartilhado.

### 3. Extracao de IP

Middleware/proxy do Next.js nao expoe o endereco de socket do peer
(`NextRequest.ip` foi removido). A unica fonte e o header `x-forwarded-for`, que e
controlado pelo cliente quando nao ha proxy confiavel reescrevendo-o.

**A. Confiar na entrada mais a esquerda do XFF.** Funciona sem configuracao e e
burlavel em uma linha (`curl -H 'x-forwarded-for: <aleatorio>'`). Rejeitado: um
limiter que o atacante desliga sozinho nao e um controle.

**B. Contagem de hops confiaveis configuravel. ESCOLHIDA.**
`RATE_LIMIT_TRUSTED_HOPS` (inteiro, default `1`) = quantos proxies confiaveis
existem na frente da app. O IP do cliente e a N-esima entrada a partir da direita:
`parts[parts.length - hops]`. Com `hops=1` e um reverse proxy que faz append do
peer real, entradas forjadas pelo cliente ficam a esquerda e sao ignoradas — nao
influenciam a chave.

**C. Nao confiar em XFF, bucket global unico.** Rejeitado: um unico atacante
consumiria a cota de todo mundo (DoS trivial).

**Fallback quando o XFF esta ausente ou tem menos entradas que `hops`:** chave
compartilhada `"__untrusted__"` com orcamento proprio e maior. Nao e fail-open
(trafego sem proxy identificavel ainda tem teto) nem fail-closed global (nao
derruba trafego legitimo identificavel, que esta em buckets separados).

**Modos de falha da configuracao, explicitamente:**
- `hops` alto demais -> a chave passa a ser um valor escolhido pelo atacante ->
  limiter inefetivo, mas nenhum usuario legitimo e bloqueado.
- `hops` baixo demais -> a chave vira o IP do proprio proxy -> *todo* o trafego
  colapsa num bucket -> 429 para usuarios legitimos. Este e o modo perigoso, e a
  razao pela qual o orcamento e generoso (abaixo) e o valor e um env var
  documentado em `.env.example`.

### 4. Dimensionamento (AC#2)

Janela fixa de **60s**, **120 requests por IP** nas rotas publicas de leitura.

Racional numerico:
- Uma visualizacao de pagina custa exatamente **1 request contado**. Os icones
  (`/api/icon`), o catalogo (`/api/items`) e os assets estaticos estao fora do
  matcher, entao uma pagina com 40 icones nao consome 41 tokens.
- Leitores distintos vindos do Discord chegam de IPs distintos: cada um tem o
  proprio bucket. O limite so pode incomodar quando muita gente compartilha um
  egress (CGNAT movel, rede corporativa).
- 120/min cobre ~120 espectadores simultaneos atras de um mesmo NAT abrindo o
  link no mesmo minuto — bem acima de um `@everyone` de guilda tipico, onde os
  cliques ainda se espalham por varios minutos e varios IPs.
- Um humano relendo/atualizando a mesma comp fica abaixo de ~10/min.
- Contra o abuso: um scraper sem throttle faz facilmente ~10 req/s (600/min) de
  SSR + query; 120/min e uma reducao de ~5x no pior caso continuo e limita o custo
  por IP a 2 req/s sustentadas.
- Janela fixa permite um burst de ate 240 na virada de janela. Aceito: e uma
  ordem de grandeza abaixo do que a app aguenta e nao justifica sliding window.

Orcamento do bucket `"__untrusted__"`: **600/60s**, ~5x o de um IP identificado,
para que um deploy mal configurado degrade em vez de derrubar.

Isto e um controle de *custo*, nao deteccao de bot. Um atacante distribuido passa;
o objetivo e limitar o dano de um unico cliente e evitar hammering acidental.

### 5. Resposta de throttle (AC#3)

`429` com corpo constante, `Retry-After: 60` fixo e `Cache-Control: no-store`.
Nada na resposta deriva do slug, e o proxy retorna antes de qualquer acesso ao
banco — 429 e byte-identico para slug existente e inexistente. O contador e
incrementado igualmente nos dois casos, pela mesma razao (o proxy nao sabe a
diferenca), entao nao ha diferenca de consumo de cota observavel.

`Retry-After` nao expoe o tempo restante real da janela: seria um sinal fraco mas
desnecessario, e um valor constante nao piora a UX.

### 6. Reuso de codigo

O motor de janela fixa (sweep de expirados + eviction LRU com re-insercao) e
sutil e ja foi corrigido uma vez (ACM-051). Duplica-lo garantiria que a proxima
correcao entrasse em uma copia so. Decisao: extrair o motor para
`src/lib/fixed-window-limiter.ts` como factory, e reescrever `rate-limit.ts` como
uma instancia fina preservando sua API publica (`checkWriteRateLimit`,
`RateLimitError`, helpers `__`). O `rate-limit.test.ts` existente permanece sem
alteracao e vira o teste de regressao do refactor.

## Decisao

1. Throttle por IP no `src/proxy.ts`, antes de qualquer I/O, para
   `/build/:slug` e `/comp/:slug`.
2. Chave = XFF com `RATE_LIMIT_TRUSTED_HOPS` (default 1); fallback para bucket
   compartilhado `"__untrusted__"`.
3. 120 req/60s por IP; 600 req/60s no bucket de fallback.
4. 429 constante, sem variacao por slug, sem tocar no banco.
5. Motor de janela fixa extraido para modulo compartilhado.

## Consequencias

- O `export default` do proxy deixa de ser `auth(handler)` e passa a ser uma
  funcao que roteia entre o ramo publico (throttle) e o ramo autenticado
  (`auth(handler)`). O matcher cresce, mas rotas publicas **nao** passam pelo
  `auth()`, preservando a intencao do allow-list de decision-012: nenhum lookup
  de sessao no banco em request anonimo. `/comp/new` precisa ser resolvido para o
  ramo autenticado **antes** de `/comp/:slug`, senao a pagina de criacao vira
  rota publica.
- `src/__tests__/auth-middleware.test.ts` precisa ser atualizado para a nova
  forma do default export.
- `/api/items` e `/api/icon` continuam sem throttle. Sao superficies anonimas e
  merecem tratamento, mas com orcamento proprio: `/api/items` e pesado em banda e
  ja tem caminho de conditional GET, e `/api/icon` e um proxy de CDN com resposta
  imutavel e cacheada. Misturar os tres num bucket faria uma sessao legitima do
  editor consumir a cota de leitura publica. Fica para task de follow-up.
- Reiniciar o processo zera todos os buckets. Aceito no v1.
- Nao substitui cache: as paginas publicas seguem `force-dynamic`. Cachear a
  renderizacao publica seria a mitigacao estrutural do custo e nao esta no escopo
  desta task.
