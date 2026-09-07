---
id: ACM-069
title: 'CRITICO: garantia server-only da decision-013 NAO e enforcada pelo next build'
status: Done
assignee: []
created_date: '2026-09-07 20:35'
updated_date: '2026-09-07 20:50'
labels: []
dependencies: []
priority: high
ordinal: 69000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado da review da ACM-059 (PR #42), verificado empiricamente e PRE-EXISTENTE (nao causado por aquele PR). O reviewer importou buildStateSchema de src/lib/build-schema.ts dentro de um componente CLIENT real (src/app/(editor)/build/new/page.tsx) e rodou next build: O BUILD PASSOU, sem erro, tanto na branch quanto na main (5319049). Ou seja, o pacote 'server-only' NAO esta lancando erro em build time neste projeto hoje.\n\nPor que isso importa: a decision-013 apoia uma garantia inteira nesse mecanismo — 'o schema fica em modulo server-only, o que transforma um vazamento futuro pro cliente em ERRO DE BUILD, nao em regressao silenciosa da ACM-043'. Tres tasks ja mergeadas dependem dessa premissa: ACM-049 (build-schema), ACM-057 (comp-schema) e ACM-059 (extracao de constantes, que so foi necessaria PORQUE os schemas nao podem ser importados no cliente). Se a barreira nao dispara, entao: (1) nada impede um import client-side acidental dos schemas; (2) zod pode entrar no bundle cliente silenciosamente, violando o criterio de tempo de carga da ACM-043; (3) a justificativa da ACM-059 continua valida por convencao, mas nao por enforcement.\n\nInvestigar: se e configuracao do Turbopack/Next 16, se o pacote 'server-only' esta instalado e resolvendo corretamente, ou se o import so falha em runtime e nao em build. Depois decidir o mecanismo de enforcement real (lint rule, teste de bundle, ou config).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Causa raiz identificada: por que 'server-only' nao falha o next build neste projeto
- [ ] #2 Enforcement real implementado — import client-side de build-schema/comp-schema falha de forma deteccionavel (build, lint ou teste)
- [ ] #3 Teste/check em CI que falha se um schema server-only for importado por codigo cliente
- [ ] #4 Verificado que zod nao esta no bundle cliente hoje (medir), e que continua fora depois do fix
- [ ] #5 decision-013 atualizada com o mecanismo real de enforcement, ou corrigida se a premissa original era falsa
- [ ] #6 make check verde
<!-- AC:END -->
