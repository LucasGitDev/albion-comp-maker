---
id: ACM-084
title: >-
  Bucket untrusted compartilhado tem orcamento maior que o per-IP e depende de
  RATE_LIMIT_TRUSTED_HOPS correto
status: In Progress
assignee: []
created_date: '2026-09-08 13:38'
updated_date: '2026-09-09 14:16'
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
- [ ] #1 A relacao de orcamento entre bucket untrusted e per-IP e revisada e documentada: omitir XFF nao pode conceder cota maior que ser identificavel
- [ ] #2 Existe sinal observavel (metrica ou log) quando a fracao de trafego caindo no bucket untrusted ultrapassa um limiar, tornando deteccavel um RATE_LIMIT_TRUSTED_HOPS incorreto
- [ ] #3 A topologia de proxy esperada em producao e o valor correto de RATE_LIMIT_TRUSTED_HOPS estao documentados
- [ ] #4 Aplicado de forma consistente a todas as superficies com throttle (/build, /comp, /api/items, /api/icon), nao caso a caso
- [ ] #5 Testes cobrindo o comportamento do bucket untrusted
- [ ] #6 make check verde
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Review PR #79 (ACM-084): LGTM.

Verificado: AC#1 enforcement real via resolvePolicy() em rate-limit-policy.ts (clamp untrustedMax->perIpMax + console.error, nunca throw), aplicado no module load de createSurfaceLimiter — nao e so aviso de config, o limiter runtime usa o valor clampado. AC#2 sinal observavel via untrusted-traffic-monitor.ts (console.warn JSON untrusted_traffic_high/recovered, MIN_SAMPLES=50, histerese 0.5/0.2, relog 15min) instrumentado no unico ponto clientKeyFromHeaders. AC#3 doc-008 documenta topologia e RATE_LIMIT_TRUSTED_HOPS. AC#4 tabela unica RATE_LIMIT_POLICY cobre publicRead/items/icon (5 superficies). AC#5 testes novos (rate-limit-policy.test.ts, untrusted-traffic-monitor.test.ts) + editor-api-rate-limit.test.ts corrigido para nao afirmar mais o comportamento antigo. AC#6 CI verde (gh pr checks 79 = 1 passed).

Seguranca: monitor nao loga IP/XFF/headers, so contadores agregados e a fracao — confirmado por leitura de logLine(). clientKeyFromHeaders preserva a logica de hops inalterada (so adiciona a chamada de recordClientKeyOutcome antes de cada return).

Escopo: diff bate com o touches declarado nas notes (rate-limit-policy.ts, untrusted-traffic-monitor.ts, public-read-rate-limit.ts, editor-api-rate-limit.ts, .env.example, testes, backlog docs/decisions). src/proxy.ts e rotas de API nao foram tocados, conforme zona proibida.

Achado nao-bloqueante (MEDIUM, dívida): o plano (passo 6a) previa um teste do clamp de resolvePolicy() com uma tabela invalida injetada ('untrustedMax > perIpMax'); esse teste nao foi implementado — rate-limit-policy.test.ts so verifica a tabela real (que ja esta correta) e o comportamento em runtime, nao o caminho de enforcement/clamp em si. Hoje o clamp e codigo morto sem cobertura: se resolvePolicy() regredir (ex.: alguem trocar o '>' por '>=' ou remover o clamp), nenhum teste falha. Sugestao para follow-up: teste que injeta um SurfacePolicy invalido e afirma que o limiter resultante respeita perIpMax mesmo com untrustedMax maior na entrada.

Nota (LOW, nao bloqueia): o plano prescrevia mover clientKeyFromHeaders para um novo src/lib/client-key.ts; a implementacao manteve a funcao em public-read-rate-limit.ts (com editor-api-rate-limit.ts reexportando). Nao e um defeito — apenas divergencia do plano documentado, sem risco funcional.

Veredito: LGTM
<!-- SECTION:NOTES:END -->
