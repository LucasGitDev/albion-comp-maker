---
id: ACM-077
title: >-
  Assimetria no proxy: /comp/new vai para o ramo auth mas /build/new cai no ramo
  publico
status: In Review
assignee: []
created_date: '2026-09-08 00:13'
updated_date: '2026-09-09 03:17'
labels: []
dependencies:
  - ACM-063
priority: high
ordinal: 77000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado INFO da auditoria de seguranca da ACM-063 (PR #47). Em src/proxy.ts o roteador trata /comp/new por igualdade de string ANTES do regex PUBLIC_READ_PATHS, garantindo que va para authProxy. Mas /build/new nao recebe o mesmo tratamento: casa com o padrao /build/:slug e cai no ramo publico de leitura (throttle, sem auth()). NAO e regressao de seguranca — o matcher anterior tinha apenas /builds/:path* (plural), entao /build/new nunca esteve sob o proxy, e a protecao real da criacao de build e feita na server action saveBuild, nao no proxy. Dois problemas reais mesmo assim: (1) a assimetria e uma armadilha de leitura — quem abrir proxy.ts ve /comp/new explicitamente roteado para auth e pode assumir que /build/new tambem esta protegido; (2) acessos a /build/new (pagina do editor) agora consomem o orcamento de 120/60s de leitura publica compartilhado por IP, efeito nao mencionado na decision-016. Decidir explicitamente qual dos dois comportamentos e o correto e tornar simetrico, documentando na decision-016.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tratamento de /build/new e /comp/new no proxy e simetrico e a escolha esta documentada em comentario e na decision-016,Se /build/new sair do ramo publico, deixa de consumir o orcamento de leitura publica,Teste cobrindo a rota literal escolhida para cada um dos dois casos,make check verde
<!-- AC:END -->
