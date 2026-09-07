---
id: ACM-049
title: >-
  Validar data_json de build com Zod (size cap + shape) antes das paginas
  publicas SSR
status: In Progress
assignee: []
created_date: '2026-09-07 18:54'
updated_date: '2026-09-07 19:08'
labels: []
dependencies: []
priority: high
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da auditoria de seguranca da ACM-018 (PR #28). Em src/actions/builds.ts, saveBuild/updateBuild recebem 'content' (data_json) tipado como string e persistem com ZERO validacao em runtime. O comentario em schema.ts afirma que o campo e 'validated by a shared Zod schema at the application layer' — isso e FALSO, nenhum schema desse tipo existe em src/actions (confirmado por grep). Dois riscos concretos: (1) sem limite de tamanho -> abuso de storage / DoS; (2) sem validacao de shape -> precursor de stored XSS assim que a ACM-021 renderizar paginas publicas de build via SSR a partir dessa coluna. Hoje o dado so volta para o proprio dono, entao o risco esta contido; ele DETONA quando conteudo controlado pelo usuario passar a ser servido a terceiros. Precisa pousar antes da ACM-021.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Existe um Zod schema compartilhado para o payload de build, aplicado com .parse() em saveBuild e updateBuild
- [ ] #2 Limite maximo de tamanho aplicado ao data_json, com erro claro ao exceder
- [ ] #3 Shape validado: campos desconhecidos rejeitados ou removidos, nao persistidos as-is
- [ ] #4 Comentario enganoso em schema.ts corrigido ou passa a ser verdadeiro
- [ ] #5 Testes cobrindo payload acima do limite e payload com shape invalido
- [ ] #6 make check verde
<!-- AC:END -->
