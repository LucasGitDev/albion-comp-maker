---
id: ACM-072
title: Rate limiting para /api/items e /api/icon (superficies anonimas sem throttle)
status: Done
assignee: []
created_date: '2026-09-08 00:03'
updated_date: '2026-09-08 13:41'
labels: []
dependencies:
  - ACM-063
ordinal: 72000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-up identificado pela decision-016 (planejamento da ACM-063). As rotas /api/items (serve o catalogo ao-data.json gzipado a cada request) e /api/icon (proxy de CDN) sao superficies anonimas e continuam sem nenhum throttle apos a ACM-063. Foram deliberadamente EXCLUIDAS do bucket de leitura publica da ACM-063: uma sessao legitima do editor faz muitas chamadas a essas rotas e consumiria a cota das paginas publicas, gerando 429 em uso normal. Precisam de orcamento proprio, dimensionado para o padrao de uso do editor (dezenas de icones por render de pagina), nao para page views.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Throttle aplicado a /api/items e /api/icon com orcamento proprio, separado do bucket de leitura publica da ACM-063,Limite dimensionado para uso legitimo do editor (uma pagina do editor carrega dezenas de icones sem estourar) com racional documentado,Reusa o motor compartilhado de fixed-window-limiter introduzido pela ACM-063 em vez de duplicar logica de eviction,Testes cobrindo o limite e o comportamento apos exceder,make check verde
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementado em src/lib/editor-api-rate-limit.ts: dois buckets fixed-window separados, um para /api/items e outro para /api/icon, reusando createFixedWindowLimiter (fixed-window-limiter.ts) e clientKeyFromHeaders/UNTRUSTED_KEY de public-read-rate-limit.ts (mesma logica anti-spoof de XFF/hops, sem duplicacao).

Racional dos limites (por IP, janela de 60s):
- /api/items: 30 req/60s. E um unico fetch pesado (catalogo gzip ~63KB) por carregamento de pagina do editor, revalidado depois via ETag/304 barato — nao e proporcional a quantidade de icones na tela. 30/min cobre confortavelmente varias abas/reloads do editor por um mesmo IP em um minuto, e ainda limita scraping do catalogo.
- /api/icon: 600 req/60s. Um unico render de comp pode disparar dezenas de requests (item + habilidades Q/W/E/passiva de cada slot, em varios builds e swaps). O orcamento e uma ordem de grandeza acima do de /api/items e do bucket de leitura publica da ACM-063 (120/60s), para absorver esse fan-out de uma sessao real do editor sem gerar 429 em uso normal, mantendo ainda um teto para scraping de imagens.
- Bucket "untrusted" (sem IP identificavel via XFF) proprio por rota, maior que o per-IP (150 para items, 3000 para icon), mesmo padrao de degradacao da ACM-063: evita colapsar todo trafego anonimo num unico bucket pequeno em deploy sem proxy configurado.

Resposta 429 (throttledApiResponse): corpo/headers constantes (Retry-After: 60, Cache-Control: no-store), sem vazar informacao dependente do request, mesmo padrao do throttledResponse do proxy.ts (decision-016 AC#3).

Testes: src/__tests__/editor-api-rate-limit.test.ts (limite por rota, orcamentos independentes por rota para o mesmo IP, keying por IP, expiracao de janela, bucket untrusted) + casos de throttle adicionados em api-items-route.test.ts e novo api-icon-route.test.ts cobrindo o 429 e seus headers.

make check verde (56 arquivos de teste, 443 testes).

AUDITORIA DE SEGURANCA (PR #52) — VEREDITO: LGTM (sem CRITICAL/HIGH)

1. Bypass por XFF forjado — OK. clientKeyFromHeaders (reusada de public-read-rate-limit.ts) pega o N-esimo elemento a partir da DIREITA (parts[parts.length - hops]), nao o primeiro. Entradas forjadas pelo cliente ficam à esquerda do hop confiavel e sao ignoradas, desde que RATE_LIMIT_TRUSTED_HOPS esteja corretamente configurado para o numero real de proxies reversos na frente do app. Nao ha regressao nesta PR: a logica anti-spoof e importada, nao reimplementada.

2. Bucket "untrusted" compartilhado — MEDIUM (risco herdado, nao introduzido por esta PR). Omitir o header X-Forwarded-For (trivial via curl em deploy sem proxy configurado, ou se RATE_LIMIT_TRUSTED_HOPS > hops reais) direciona o atacante para o bucket untrusted, que tem orcamento MAIOR que o per-IP (150 vs 30 em /api/items; 3000 vs 600 em /api/icon) e e compartilhado globalmente. Isso permite: (a) um unico atacante sem XFF consumir uma cota maior que a de um IP legitimo identificado; (b) esgotar de proposito o bucket compartilhado e negar servico a todo trafego anonimo nao identificavel (DoS por envenenamento de bucket). Este e o mesmo padrao ja aceito na ACM-063/decision-016 para /build /comp; nao e uma regressao desta PR, mas o risco se repete aqui. Nao bloqueia por ja ser decisao de arquitetura aceita, mas registrar caso o app rode sem proxy confiavel em producao (nesse cenario TODO trafego cai no bucket untrusted e o rate limit por IP deixa de existir de fato).

3. Memoria/DoS no limiter — OK. maxBuckets=10_000 com sweep de janelas expiradas + eviction LRU (fixed-window-limiter.ts, herdado de ACM-051/063). Chaves forjadas via XFF rotativo nao causam crescimento ilimitado do Map; o pior caso e thrashing de eviction, nao exaustao de memoria.

4. /api/icon ordem de checagem e SSRF — OK. checkIconRateLimit roda ANTES do parse de query params e do fetch upstream (route.ts linha ~29-32), entao um 429 nunca dispara o fetch caro à CDN. SSRF nao aplicavel: id validado por regex `^[A-Z0-9_@]+$`, type restrito a enum ("item"|"spell"), URL upstream montada a partir de RENDER_BASE_URL fixo + id validado — nao ha input do usuario controlando host/scheme.

5. Oraculo/vazamento no 429 — OK. throttledApiResponse() retorna corpo/status/headers constantes (429, "Too many requests", Retry-After: 60, Cache-Control: no-store), nada derivado do request. Mesmo padrao do throttledResponse em proxy.ts.

6. Ordem vs autenticacao — N/A. Rotas sao publicas por design (catalogo de itens e proxy de icones, sem dado de tenant/usuario); rate limit e o unico controle de acesso aplicavel e roda antes de qualquer acesso a dado (fs.readFile do catalogo / fetch da CDN).

Nenhum finding CRITICAL ou HIGH novo. Um MEDIUM herdado (item 2) ja e risco arquitetural conhecido e aceito desde decision-016; nao bloqueia merge desta PR especificamente, mas vale confirmar em producao que RATE_LIMIT_TRUSTED_HOPS reflete a topologia real de proxy.

REVIEW (correção/ACs/regressão, eixo de segurança auditado em paralelo):

Nenhum finding bloqueante.

Verificações feitas:
- Orçamento separado confirmado: checkItemsRateLimit/checkIconRateLimit usam limiters distintos (itemsPerIpLimiter/iconPerIpLimiter), não compartilham instância com o perIpLimiter de public-read-rate-limit.ts. Teste "keeps a separate budget per route" em editor-api-rate-limit.test.ts exercita a transição real (exaure /api/items para um IP, confirma que /api/icon segue com budget cheio no mesmo IP/instante) — não é teste que passaria com bug de bucket compartilhado presente.
- Reuso do motor confirmado: editor-api-rate-limit.ts só chama createFixedWindowLimiter (fixed-window-limiter.ts) e não reimplementa eviction/sweep/LRU — grep não encontrou lógica de expiração duplicada no arquivo novo.
- Dimensionamento do limite avaliado com cenário concreto: use-item-catalogue.tsx cacheia o catálogo em module scope (`cached`/`inflight`) e só faz 1 fetch por carregamento de página (sobrevive a remounts do componente enquanto a página está aberta) — não é 1 request por item/aba. 30 req/60s por IP cobre ~30 reloads completos de página por minuto, folga real mesmo com StrictMode (dobra o efeito mas o guard `if (cached) return` já neutraliza o segundo fetch de qualquer forma). /api/icon 600/60s cobre fan-out de várias builds/swaps com folga de uma ordem de grandeza. Racional documentado no arquivo bate com o comportamento real do client, não é só assertiva do PR.
- Testes de transição: api-items-route.test.ts e api-icon-route.test.ts fazem loop de N requests permitidos + N+1 esperando 429 (não apenas 1 request isolado), e editor-api-rate-limit.test.ts cobre reset de janela com tempo injetado (sem fake timers) e keying por IP (segundo IP não afetado). Não encontrei teste que passaria trivialmente com o bug presente.
- Isolamento entre testes: api-items-route.test.ts e api-icon-route.test.ts chamam vi.resetModules() em beforeEach, então cada teste reimporta editor-api-rate-limit.ts como módulo novo (limiters de instância nova) — não há vazamento de estado entre os testes de throttle, além de usarem IPs distintos como segunda camada de isolamento. editor-api-rate-limit.test.ts usa __resetEditorApiRateLimitState() em afterEach para o módulo compartilhado dentro do próprio arquivo. Não identifiquei fonte de flakiness.
- Escopo: diff toca apenas src/app/api/{items,icon}/route.ts, src/lib/editor-api-rate-limit.ts e 3 arquivos de teste novos/editados — nenhum arquivo do PR #50 (build-card, ThemePanel, EditorActionBar, schema/drizzle) tocado.
- Commits do PR sem trailer Co-Authored-By nem atribuição de IA.
- make check verde no worktree da task (56 arquivos de teste, 443 testes, lint só com 2 warnings pré-existentes de <img>, build e tsc ok).

Veredito: LGTM (eixo correção/ACs/regressão). Aguardar findings do security-reviewer antes do merge.
<!-- SECTION:NOTES:END -->
<!-- SECTION:NOTES:END -->
