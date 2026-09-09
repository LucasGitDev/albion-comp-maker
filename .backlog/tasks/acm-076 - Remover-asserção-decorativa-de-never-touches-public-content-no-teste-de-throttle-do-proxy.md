---
id: ACM-076
title: >-
  Remover asserção decorativa de 'never touches public-content' no teste de
  throttle do proxy
status: To Do
assignee: []
created_date: '2026-09-08 00:10'
updated_date: '2026-09-09 03:07'
labels: []
dependencies:
  - ACM-063
priority: low
ordinal: 76000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da review da ACM-063 (PR #47). Em src/__tests__/public-read-throttle-proxy.test.ts a asserção expect(getPublicBuildBySlug).not.toHaveBeenCalled() é vazia por construção: src/proxy.ts nunca importa @/lib/public-content (só src/app/build/[slug]/page.tsx e src/app/comp/[slug]/page.tsx importam). Não existe caminho de código, correto ou quebrado, que faria esse mock ser chamado dentro do teste isolado do proxy. A asserção passa trivialmente e cria falso senso de segurança. A garantia real de 'não toca no banco' é ARQUITETURAL (o proxy roda antes do route handler e não importa o módulo de dados), documentada na decision-016, e não é verificável nesse nível de teste unitário. As outras 4 asserções do mesmo teste (status, corpo e headers idênticos entre slug existente e inexistente) cobrem o AC#3 de forma real e não-tautológica — essas devem permanecer.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Asserção decorativa removida ou o teste renomeado para refletir que a garantia é arquitetural e não testada por unit test do proxy,As 4 asserções de byte-identidade da resposta 429 entre slug existente e inexistente permanecem intactas,make check verde
<!-- AC:END -->
