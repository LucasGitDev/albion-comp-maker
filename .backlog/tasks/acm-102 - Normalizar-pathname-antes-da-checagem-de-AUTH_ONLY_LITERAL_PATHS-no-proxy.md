---
id: ACM-102
title: Normalizar pathname antes da checagem de AUTH_ONLY_LITERAL_PATHS no proxy
status: To Do
assignee: []
created_date: '2026-09-09 03:17'
labels:
  - security
  - proxy
dependencies: []
ordinal: 100000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da auditoria de seguranca da ACM-077 (PR #67, SHA ec01ab3). AUTH_ONLY_LITERAL_PATHS em src/proxy.ts usa igualdade exata de string sobre req.nextUrl.pathname nao normalizado, enquanto PUBLIC_READ_PATHS (/^\\/(build|comp)\\/[^/]+\\/?$/) e tolerante a trailing slash e a qualquer caractere non-slash no segmento. Dois bypasses reproduzem o bug que a ACM-077 corrigiu, por vetor diferente: (1) GET /build/new/ com trailing slash nao bate no Set mas bate no regex publico; (2) GET /build/%6Ee%77 (percent-encoding de 'new') nao e decodificado por URL.pathname, nao bate no Set, bate no regex publico, e o router do Next decodifica e serve a mesma pagina. Impacto limitado: /build/new e client component sem fetch sensivel e a protecao real de escrita e requireSession() na server action saveBuild — portanto e bypass de UX e de orcamento de rate limit (volta a consumir o budget compartilhado de 120/60s por IP), nao de dado. Por isso MEDIUM e nao HIGH. Nota: /BUILD/new e //build/new NAO sao bypass, caem no authProxy final (fail-safe). O gap de igualdade exata e herdado do === '/comp/new' original, anterior a ACM-077.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Pathname e normalizado (decode de percent-encoding + strip de trailing slash) antes da checagem em AUTH_ONLY_LITERAL_PATHS,Teste cobrindo /build/new/ com trailing slash indo para o ramo auth,Teste cobrindo segmento percent-encoded (/build/%6Ee%77) indo para o ramo auth,Testes de nao-regressao: /BUILD/new e //build/new continuam no authProxy e /build/<slug-real> continua no ramo publico,make check verde
<!-- AC:END -->
