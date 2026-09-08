---
id: ACM-063
title: Rate limiting nas paginas publicas anonimas (primeira superficie sem throttle)
status: In Progress
assignee: []
created_date: '2026-09-07 20:30'
updated_date: '2026-09-07 23:59'
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
- [ ] #1 Rate limiting aplicado as rotas publicas de leitura, keyed por IP ou equivalente (nao por user id)
- [ ] #2 Limite nao quebra uso legitimo: um link compartilhado no Discord pode receber muitos acessos distintos e legitimos em pouco tempo — dimensionar com isso em mente e documentar o racional
- [ ] #3 Resposta de throttle nao vaza se o slug existe ou nao (sem oraculo de existencia)
- [ ] #4 Testes cobrindo o limite e o comportamento apos exceder
- [ ] #5 make check verde
<!-- AC:END -->
