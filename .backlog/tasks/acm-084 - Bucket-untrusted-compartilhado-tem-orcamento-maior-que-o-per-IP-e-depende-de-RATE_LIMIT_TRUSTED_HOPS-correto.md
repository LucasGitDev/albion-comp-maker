---
id: ACM-084
title: >-
  Bucket untrusted compartilhado tem orcamento maior que o per-IP e depende de
  RATE_LIMIT_TRUSTED_HOPS correto
status: In Progress
assignee: []
created_date: '2026-09-08 13:38'
updated_date: '2026-09-09 14:12'
labels: []
dependencies: []
priority: medium
ordinal: 82000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Levantado pela auditoria de seguranca da ACM-072 (PR #52) como MEDIUM. Nao e regressao daquela PR: e risco herdado da decision-016 (ACM-063), mas agora se repete numa segunda superficie, o que o torna padrao e nao excecao.

Problema em duas partes:

1. O bucket 'untrusted' (requests sem X-Forwarded-For identificavel) tem orcamento MAIOR que o per-IP: 150 vs 30 em /api/items, 3000 vs 600 em /api/icon. Como o bucket e escolhido pela AUSENCIA de um header que o proprio cliente controla, um atacante pode deliberadamente omitir XFF para cair no bucket maior. Alem disso, por ser compartilhado globalmente, o mesmo atacante pode esgota-lo de proposito e negar servico a todo o trafego anonimo nao identificavel.

2. Agravante de configuracao: se RATE_LIMIT_TRUSTED_HOPS nao corresponder a topologia real de proxy em producao, TODO o trafego passa a cair no bucket untrusted. O controle degrada silenciosamente para um unico balde global — sem nenhum sinal de que isso aconteceu.

O ponto 2 e o mais perigoso porque falha em silencio. Um rate limiter que degradou para bucket unico continua retornando 200 e parece saudavel.

Avaliar: inverter a relacao (untrusted deveria ser MAIS restrito que per-IP, nao menos), e/ou emitir metrica/log quando a proporcao de trafego untrusted ultrapassar um limiar, para que a configuracao errada de hops seja observavel.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 A relacao de orcamento entre bucket untrusted e per-IP e revisada e documentada: omitir XFF nao pode conceder cota maior que ser identificavel
- [x] #2 Existe sinal observavel (metrica ou log) quando a fracao de trafego caindo no bucket untrusted ultrapassa um limiar, tornando deteccavel um RATE_LIMIT_TRUSTED_HOPS incorreto
- [x] #3 A topologia de proxy esperada em producao e o valor correto de RATE_LIMIT_TRUSTED_HOPS estao documentados
- [x] #4 Aplicado de forma consistente a todas as superficies com throttle (/build, /comp, /api/items, /api/icon), nao caso a caso
- [x] #5 Testes cobrindo o comportamento do bucket untrusted
- [x] #6 make check verde
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Ler decision-029 ANTES de escrever codigo — ela contem o racional completo (paridade de orcamento, ausencia de particao segura, histerese do alerta). Este plano so executa o que ela decidiu.

1. Criar src/lib/rate-limit-policy.ts: type ThrottleSurface = 'publicRead' | 'items' | 'icon'; tabela RATE_LIMIT_POLICIES: Record<ThrottleSurface, { windowMs: number; perIpMax: number; untrustedMax: number }> com publicRead {60000,120,120}, items {60000,30,30}, icon {60000,600,600}. Exportar UNTRUSTED_KEY ('__untrusted__') daqui. Na carga do modulo, percorrer a tabela: se untrustedMax > perIpMax, fazer clamp para perIpMax e console.error (NUNCA throw — nao derrubar producao). Exportar createSurfaceLimiter(surface) que instancia dois createFixedWindowLimiter (per-IP com maxBuckets 10000, untrusted com maxBuckets 1, sweep 5min) e devolve { check(key, now) } roteando por key === UNTRUSTED_KEY, mais reset() para testes. Sem import de 'server-only' (roda em src/proxy.ts).
   Verificavel: tsc --noEmit passa; nenhum consumidor ainda importa o modulo.

2. Criar src/lib/untrusted-traffic-monitor.ts: recordKeyClassification(isUntrusted: boolean, now?: number). Janela de 60s com contadores total/untrusted, avaliada na virada de janela. Piso MIN_SAMPLES=50 (abaixo disso nao avalia). Estado 'ok' | 'alerting'. Transicao ok->alerting quando fracao >= 0.5: console.warn com uma linha JSON { event: 'rate_limit.untrusted_fraction_high', fraction, windowTotal, trustedHops, action: 'check RATE_LIMIT_TRUSTED_HOPS against the real proxy topology' }. Enquanto alerting sustentado, re-emitir no maximo a cada 15 min. Transicao alerting->ok quando fracao < 0.2 (banda morta 0.2-0.5), emitindo uma linha 'rate_limit.untrusted_fraction_recovered'. NUNCA logar IP, XFF bruto ou qualquer header. Exportar __resetUntrustedTrafficMonitor() para testes.
   Verificavel: teste dedicado (passo 6) cobre limiar, piso e histerese.

3. Mover clientKeyFromHeaders para src/lib/client-key.ts (mesma logica de hops a partir da direita, sem mudanca de comportamento de derivacao), chamando recordKeyClassification(key === UNTRUSTED_KEY) antes de retornar. Esse e o unico ponto de instrumentacao — nao instrumentar call sites. Re-exportar clientKeyFromHeaders e UNTRUSTED_KEY de public-read-rate-limit.ts e de editor-api-rate-limit.ts para nao quebrar nenhum import existente.
   Verificavel: grep confirma que src/proxy.ts, src/app/api/items/route.ts, src/app/api/icon/route.ts e src/app/api/background/[id]/route.ts continuam com os imports inalterados.

4. Reescrever src/lib/public-read-rate-limit.ts como instancia fina de createSurfaceLimiter('publicRead'), preservando os nomes exportados hoje: PUBLIC_READ_WINDOW_MS, PUBLIC_READ_MAX_PER_IP, UNTRUSTED_KEY, UNTRUSTED_MAX (agora 120, derivado da tabela), checkPublicReadRateLimit, __resetPublicReadRateLimitState. Atualizar o bloco de doc do modulo para citar decision-029 e remover a prosa que afirma que o bucket untrusted tem orcamento maior.
   Verificavel: src/__tests__/public-read-rate-limit.test.ts e public-read-throttle-proxy.test.ts continuam verdes (exceto asserts que dependiam do orcamento antigo — corrigir no passo 6).

5. Mesmo tratamento em src/lib/editor-api-rate-limit.ts: duas instancias de createSurfaceLimiter ('items' e 'icon'), preservando ITEMS_MAX_PER_IP, ICON_MAX_PER_IP, ITEMS_UNTRUSTED_MAX (150->30), ICON_UNTRUSTED_MAX (3000->600), checkItemsRateLimit, checkIconRateLimit, throttledApiResponse, __resetEditorApiRateLimitState. throttledApiResponse fica inalterada. NAO tocar em src/lib/rate-limit.ts (keyed por userId, fora do escopo — ver decision-029 secao 3B).
   Verificavel: make check verde; nenhuma rota alterada.

6. Testes. (a) src/__tests__/rate-limit-policy.test.ts: percorre RATE_LIMIT_POLICIES e assert untrustedMax <= perIpMax para TODA superficie (esta e a guarda de CI que impede a quarta copia do defeito); e um caso do clamp com uma tabela invalida injetada. (b) src/__tests__/untrusted-traffic-monitor.test.ts: nao alerta abaixo de MIN_SAMPLES mesmo com 100% untrusted; alerta uma unica vez ao cruzar 0.5; nao re-alerta dentro de 15 min sustentado; emite recuperacao ao cair abaixo de 0.2; nao emite nada na banda 0.2-0.5 vinda de 'ok'. Usar spy em console.warn e clock injetado (nao fake timers, seguindo o padrao dos testes existentes). (c) Corrigir o caso 'routes requests with no identifiable IP into the shared untrusted bucket' em editor-api-rate-limit.test.ts: hoje ele afirma que untrusted excede ITEMS_MAX_PER_IP — inverter para afirmar que o balde untrusted NEGA no request ITEMS_MAX_PER_IP+1, e adicionar o caso simetrico para publicRead e icon. (d) Novo caso: esgotar o balde untrusted NAO afeta um IP identificavel na mesma superficie, e esgotar untrusted de 'icon' nao afeta untrusted de 'items'.
   Verificavel: npm test verde, com os novos casos falhando se untrustedMax voltar a ser > perIpMax.

7. Documentacao operacional. (a) backlog doc create 'Topologia de proxy e RATE_LIMIT_TRUSTED_HOPS' -t guide, escrevendo no path retornado: topologia esperada do v1 (um proxy reverso que faz append do peer real -> hops=1), variantes (CDN na frente = 2; sem proxy = nao ha valor correto), como contar as entradas de XFF na borda, o que o alerta rate_limit.untrusted_fraction_high significa e a acao do operador, e a tabela de orcamentos por superficie. (b) Atualizar o comentario de RATE_LIMIT_TRUSTED_HOPS em .env.example apontando para esse doc e para decision-029.
   Verificavel: backlog doc list mostra o novo doc; .env.example cita o valor de producao.

8. make check verde no branch, PR, status In Review. Anotar em --append-notes o ID decision-029 e o novo doc.

ZONA PROIBIDA (outro orquestrador ativo): src/app/page.tsx, src/app/comps/, src/components/theme-panel/. NAO reverter AUTH_ONLY_LITERAL_PATHS em src/proxy.ts (introduzido ha minutos pela ACM-077) — idealmente src/proxy.ts nao e alterado por esta task; se for, apenas comentario.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**touches** (escopo de arquivos para paralelizacao — erra pra mais):
- src/lib/rate-limit-policy.ts (novo)
- src/lib/untrusted-traffic-monitor.ts (novo)
- src/lib/client-key.ts (novo)
- src/lib/public-read-rate-limit.ts
- src/lib/editor-api-rate-limit.ts
- src/lib/fixed-window-limiter.ts (so se precisar de ajuste de tipo; preferir nao tocar)
- src/__tests__/rate-limit-policy.test.ts (novo)
- src/__tests__/untrusted-traffic-monitor.test.ts (novo)
- src/__tests__/public-read-rate-limit.test.ts
- src/__tests__/editor-api-rate-limit.test.ts
- src/__tests__/public-read-throttle-proxy.test.ts
- .env.example
- .backlog/decisions/decision-029*.md, .backlog/docs/**, .backlog/tasks/acm-084*.md

NAO toca: src/proxy.ts, src/app/api/**, src/lib/rate-limit.ts, package.json.
Zona proibida absoluta: src/app/page.tsx, src/app/comps/**, src/components/theme-panel/**.

Arquitetura registrada em decision-029 (sucessora das secoes 3 e 4 da decision-016).

Implementado: src/lib/rate-limit-policy.ts (tabela declarativa untrustedMax<=perIpMax + createSurfaceLimiter), src/lib/untrusted-traffic-monitor.ts (console.warn com histerese, AC#2), refactor de public-read-rate-limit.ts e editor-api-rate-limit.ts para consumir a tabela, doc-008 (topologia de proxy / RATE_LIMIT_TRUSTED_HOPS, AC#3) e decision-029. Ver decision-029 para o racional completo.
<!-- SECTION:NOTES:END -->
