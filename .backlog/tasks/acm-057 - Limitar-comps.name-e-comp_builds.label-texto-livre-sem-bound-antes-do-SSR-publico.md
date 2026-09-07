---
id: ACM-057
title: >-
  Limitar comps.name e comp_builds.label (texto livre sem bound antes do SSR
  publico)
status: To Do
assignee: []
created_date: '2026-09-07 19:35'
updated_date: '2026-09-07 19:35'
labels: []
dependencies: []
priority: high
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da auditoria de seguranca da ACM-019 (PR #35). comps.name e comp_builds.label sao texto livre controlado pelo usuario e NAO tem nenhum limite de tamanho nem validacao de schema em nenhum caminho de escrita: createComp, updateComp, addBuildToComp e updateCompBuild em src/actions/comps.ts. As notas da ACM-019 invocam o precedente da ACM-049, mas so trataram o risco de SHAPE de JSON — nao o risco de TEXTO ILIMITADO, que era metade do ponto da ACM-049 (o cap de 128 KiB existia justamente para abuso de storage). Hoje o risco e abuso de storage. No momento em que a ACM-021 renderizar comps publicamente via SSR, vira texto de usuario nao confiavel e ilimitado servido a terceiros. Nota: comps/comp_builds nao carregam JSON livre, entao validateBuildContentForWrite nao se aplica — o que falta e bound de tamanho, nao validacao de shape.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 comps.name limitado (sugestao <=100 chars) e validado no caminho de escrita
- [ ] #2 comp_builds.label limitado (sugestao <=200 chars) e validado no caminho de escrita
- [ ] #3 Limites aplicados em createComp, updateComp, addBuildToComp e updateCompBuild — nenhum caminho de escrita sem bound
- [ ] #4 Limites derivam de fonte unica compartilhada, sem numeros magicos duplicados (ver ACM-056)
- [ ] #5 Testes cobrindo payload acima do limite em cada acao
- [ ] #6 make check verde
<!-- AC:END -->
