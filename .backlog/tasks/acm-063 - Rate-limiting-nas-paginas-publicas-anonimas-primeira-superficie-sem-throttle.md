---
id: ACM-063
title: Rate limiting nas paginas publicas anonimas (primeira superficie sem throttle)
status: Done
assignee: []
created_date: '2026-09-07 20:30'
updated_date: '2026-09-08 00:13'
labels: []
dependencies: []
priority: high
ordinal: 63000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da auditoria de seguranca da ACM-021 (PR #41). O rate limiter em src/lib/rate-limit.ts e keyed em session.user.id e so protege Server Actions de ESCRITA autenticadas. As paginas publicas SSR (/build/[slug], /comp/[slug]) sao a PRIMEIRA superficie anonima do produto e nao tem nenhum throttle. A entropia do slug (nanoid(8)) torna brute-force de descoberta inviavel, entao nao e um vetor de enumeracao — o risco e scraping e hammering de slugs JA CONHECIDOS (um link compartilhado no Discord e publico por definicao), cada request fazendo query no banco e renderizando SSR. Nao bloqueou o merge da ACM-021 porque a lacuna e pre-existente e a superficie e read-only, mas agora esta exposta de verdade. Precisa de um limiter por IP (nao por user id, que nao existe aqui), provavelmente na camada de proxy/middleware.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Rate limiting aplicado as rotas publicas de leitura, keyed por IP ou equivalente (nao por user id)
- [x] #2 Limite nao quebra uso legitimo: um link compartilhado no Discord pode receber muitos acessos distintos e legitimos em pouco tempo — dimensionar com isso em mente e documentar o racional
- [x] #3 Resposta de throttle nao vaza se o slug existe ou nao (sem oraculo de existencia)
- [x] #4 Testes cobrindo o limite e o comportamento apos exceder
- [x] #5 make check verde
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Ver decision-016 para o racional completo (camada, XFF, numeros, oraculo). Passos:

1. Extrair o motor de janela fixa para src/lib/fixed-window-limiter.ts: exportar createFixedWindowLimiter({ windowMs, max, maxBuckets, sweepIntervalMs }) devolvendo { check(key, now?), reset(), peek(key) }. Mover para la, SEM alterar comportamento, o sweep de expirados, o evictIfOverCapacity (sweep de expirados primeiro, depois LRU) e o touch (delete+set) documentados em rate-limit.ts. Modulo puro, zero dependencias, sem import de 'server-only' (roda no proxy). check() retorna boolean (allowed) em vez de lancar; quem lanca e o wrapper.
   Verificacao: tsc --noEmit passa; nenhum teste novo ainda.

2. Reescrever src/lib/rate-limit.ts como instancia fina do factory (windowMs 60_000, max 30, maxBuckets 10_000), preservando exatamente a API publica atual: checkWriteRateLimit(userId, now?) lancando RateLimitError, RateLimitError, __resetRateLimitState, __peekBucketForTest.
   Verificacao: src/__tests__/rate-limit.test.ts passa SEM nenhuma alteracao no arquivo. Esse e o teste de regressao do refactor — se precisar editar o teste, o refactor mudou comportamento e esta errado.

3. Criar src/lib/public-read-rate-limit.ts:
   - const PUBLIC_READ_WINDOW_MS = 60_000; PUBLIC_READ_MAX_PER_IP = 120; UNTRUSTED_KEY = '__untrusted__'; UNTRUSTED_MAX = 600. Exportar as constantes (os testes usam elas, nao numeros hardcoded).
   - Duas instancias do factory (uma por orcamento) ou uma instancia com max por chave; escolher a forma mais simples que permita orcamentos diferentes.
   - export function clientKeyFromHeaders(headers: Headers): string — le 'x-forwarded-for', split por ',', trim, descarta vazias; hops = parseInt(process.env.RATE_LIMIT_TRUSTED_HOPS ?? '1', 10), clamp para >= 1 e NaN -> 1; se parts.length >= hops retorna parts[parts.length - hops], senao UNTRUSTED_KEY. Comentario no topo explicando por que a entrada mais a esquerda NAO e usada (spoofing) e os dois modos de falha de configuracao (decision-016 secao 3).
   - export function checkPublicReadRateLimit(key: string, now?: number): boolean.
   - Helpers de teste __resetPublicReadRateLimitState().
   Verificacao: tsc + lint.

4. Adicionar RATE_LIMIT_TRUSTED_HOPS ao .env.example com comentario de uma linha: numero de reverse proxies confiaveis na frente da app; 1 = um proxy que faz append do IP real do peer. NAO adicionar ao .env do repo se ele nao for versionado — conferir .gitignore antes.

5. Reestruturar src/proxy.ts:
   - const PUBLIC_READ_PATHS = /^\/(build|comp)\/[^/]+\/?$/ (um unico segmento apos build|comp).
   - const authProxy = auth(handler existente, inalterado).
   - export default function proxy(req, ctx): se req.nextUrl.pathname === '/comp/new' -> authProxy (ANTES do teste de rota publica, senao /comp/new vira rota publica). Se PUBLIC_READ_PATHS casa -> ramo publico. Caso contrario -> authProxy.
   - Ramo publico: key = clientKeyFromHeaders(req.headers); se !checkPublicReadRateLimit(key) retorna throttledResponse(); senao retorna undefined (segue o pipeline). NUNCA chamar auth() no ramo publico — request anonimo nao pode pagar lookup de sessao no banco (decision-012).
   - throttledResponse(): new Response('Too many requests', { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } }). Corpo e headers constantes, nada derivado do path/slug.
   - config.matcher passa a ['/builds/:path*', '/comp/new', '/build/:slug', '/comp/:slug'].
   - A tipagem do retorno de auth() e chata; se precisar de um cast, deixe-o localizado e comentado.
   Verificacao: pnpm build + tsc.

6. Atualizar src/__tests__/auth-middleware.test.ts para a nova forma do default export (agora recebe (req, ctx) e roteia). Manter as 3 assercoes existentes de comportamento auth intactas em substancia; adicionar a assercao do novo matcher.

7. Novo src/__tests__/public-read-rate-limit.test.ts (unitario, sem tautologia — nao asserte 'MAX === 120', use a constante exportada para dirigir o loop e asserte o comportamento na fronteira):
   a. checkPublicReadRateLimit permite PUBLIC_READ_MAX_PER_IP chamadas e nega a seguinte, com now injetado.
   b. Um SEGUNDO IP na mesma janela continua permitido depois do primeiro estourar — prova que a chave e por IP e nao global. Esta e a assercao central do AC#1.
   c. Apos now + WINDOW_MS a mesma chave e liberada (tempo injetado, sem fake timers).
   d. clientKeyFromHeaders com XFF '9.9.9.9, 1.1.1.1, 2.2.2.2' e hops=1 -> '2.2.2.2'; e a mesma request com uma entrada forjada prependada ('6.6.6.6, 9.9.9.9, 1.1.1.1, 2.2.2.2') devolve a MESMA chave. Anti-spoof, nao tautologico.
   e. hops=2 no mesmo XFF -> '1.1.1.1'.
   f. XFF ausente -> UNTRUSTED_KEY, e o bucket untrusted NAO compartilha contador com um IP real (estourar untrusted e verificar que '2.2.2.2' segue passando).
   Usar vi.stubEnv para RATE_LIMIT_TRUSTED_HOPS e resetar modulos entre casos se a leitura do env for no import.

8. Novo src/__tests__/public-read-throttle-proxy.test.tsx (ou .ts) — integracao no nivel do proxy, mockando '@/auth' como ja e feito em auth-middleware.test.ts:
   a. N+1 requests para '/build/abc12345' com o mesmo XFF -> a ultima devolve Response 429 com Retry-After '60' e Cache-Control 'no-store'.
   b. AC#3: a resposta 429 para '/build/<slug-que-existe>' e '/build/<slug-que-nao-existe>' e identica em status, corpo e headers. Alem disso, mockar '@/lib/public-content' e asserter que getPublicBuildBySlug NUNCA foi chamado no caminho throttled — a garantia real e que o throttle acontece antes de qualquer acesso a dados, nao que as strings batem.
   c. '/comp/new' NAO e throttled mesmo depois do bucket do IP estourar (vai para o ramo auth) — regressao da ordem de checagem do passo 5.
   d. '/builds/qualquer-coisa' continua indo para o ramo auth.
   e. Request abaixo do limite retorna undefined (segue o pipeline), nao uma Response.

9. Rodar make check (pnpm ci/lint/tsc/build/test). Conferir se src/__tests__/server-only-boundary.test.ts precisa de atualizacao: os novos modulos NAO devem importar 'server-only' (o proxy nao roda nesse boundary) — se o teste tiver lista explicita de modulos server-only, nao adicionar os novos la.

10. Verificacao manual (DoD item 3): rodar pnpm dev e
    curl -s -o /dev/null -w '%{http_code}\n' -H 'x-forwarded-for: 203.0.113.7' http://localhost:3000/build/zzzzzzzz repetido ~130x -> os primeiros retornam 404 e a partir do limite retornam 429; imediatamente depois, a mesma URL com -H 'x-forwarded-for: 203.0.113.8' ainda retorna 404 (bucket separado). Registrar o resultado nas notas.

Fora de escopo (follow-up): throttle em /api/items e /api/icon, com orcamento proprio — ver Consequencias em decision-016.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Plano de implementacao registrado no campo Plan. Racional arquitetural completo em decision-016 (camada proxy vs Server Component e o oraculo de existencia; XFF com RATE_LIMIT_TRUSTED_HOPS e os dois modos de falha; dimensionamento 120/60s por IP com o racional numerico do AC#2; 429 constante para o AC#3; extracao do motor de janela fixa para nao duplicar a logica de eviction corrigida na ACM-051).

touches (globs para paralelizacao — errando pra mais):
- src/proxy.ts
- src/lib/fixed-window-limiter.ts
- src/lib/rate-limit.ts
- src/lib/public-read-rate-limit.ts
- src/__tests__/auth-middleware.test.ts
- src/__tests__/rate-limit.test.ts
- src/__tests__/public-read-*.test.ts
- .env.example

Serializar contra qualquer task que toque src/proxy.ts, src/lib/rate-limit.ts ou src/app/(build|comp)/[slug].
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
PR #47 merged. Throttle por IP (120 req/60s, janela fixa) nas rotas publicas de leitura via camada de proxy, conforme decision-016. Motor extraido para src/lib/fixed-window-limiter.ts (rate-limit.test.ts passou SEM edicao, provando equivalencia do refactor). IP lido do X-Forwarded-For da DIREITA via RATE_LIMIT_TRUSTED_HOPS (default 1), nunca a entrada mais a esquerda (spoofavel); sem XFF confiavel cai em bucket __untrusted__ com orcamento proprio de 600/60s. Sem oraculo de existencia: 429 constante retornado no proxy, que nao conhece o slug nem importa o modulo de dados. Review de corretude LGTM; auditoria de seguranca APROVADA sem finding CRITICAL/HIGH. Follow-ups: ACM-072 (throttle de /api/items e /api/icon), ACM-076 (assercao decorativa), ACM-077 (assimetria /build/new vs /comp/new). make check verde na main pos-merge (382 testes).
<!-- SECTION:FINAL_SUMMARY:END -->
