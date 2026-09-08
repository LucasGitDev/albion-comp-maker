---
id: ACM-084
title: >-
  Bucket untrusted compartilhado tem orcamento maior que o per-IP e depende de
  RATE_LIMIT_TRUSTED_HOPS correto
status: To Do
assignee: []
created_date: '2026-09-08 13:38'
labels: []
dependencies: []
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
