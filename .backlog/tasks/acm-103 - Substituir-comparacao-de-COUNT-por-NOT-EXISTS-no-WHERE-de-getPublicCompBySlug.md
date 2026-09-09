---
id: ACM-103
title: Substituir comparacao de COUNT por NOT EXISTS no WHERE de getPublicCompBySlug
status: To Do
assignee: []
created_date: '2026-09-09 03:17'
labels:
  - tech-debt
  - data
dependencies: []
ordinal: 101000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da revisao da ACM-064 (PR #68, SHA 50db833). getPublicCompBySlug agora faz 3 roundtrips (comp lookup, COUNT, join) em vez de 2, e a logica tudo-ou-nada (rows.length !== totalCount) ainda e uma comparacao pos-fetch em JS — estruturalmente do mesmo tipo que a ACM-064 pedia para eliminar, so que aplicada ao invariante de 'no partial render' em vez de ao isPublic. Nao e bug: o comportamento e fail-closed (qualquer mismatch favorece null) e o AC#1 da ACM-064 foi genuinamente cumprido. E debito de design. Uma subquery correlacionada NOT EXISTS (build privada anexada a esta comp) no WHERE do comp resolveria em uma unica query, sem comparacao em JS e sem o roundtrip extra, tornando o invariante estrutural em vez de removivel. A auditoria de seguranca tambem registrou LOW de TOCTOU entre o COUNT e o JOIN (queries separadas, sem transacao) — unificar em uma query elimina esse gap de brinde.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Invariante tudo-ou-nada expresso no SQL (NOT EXISTS ou equivalente), sem comparacao de contagem pos-fetch em JS,getPublicCompBySlug faz no maximo 2 roundtrips,Comportamento inalterado: comp com qualquer build privada retorna null e privado/inexistente seguem indistinguiveis,Teste existente de comp-com-build-privada continua verde e cobre o caminho novo,make check verde
<!-- AC:END -->
