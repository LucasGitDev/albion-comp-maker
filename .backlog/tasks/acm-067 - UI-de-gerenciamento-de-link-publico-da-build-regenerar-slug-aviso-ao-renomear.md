---
id: ACM-067
title: >-
  UI de gerenciamento de link publico da build (regenerar slug, aviso ao
  renomear)
status: Done
assignee: []
created_date: '2026-09-07 20:32'
updated_date: '2026-09-09 14:22'
labels: []
milestone: m-6
dependencies: []
priority: medium
ordinal: 67000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
AC#4 da ACM-021, descopado durante a implementacao e confirmado pelo reviewer como legitimamente fora do escopo daquela task (que entregou as paginas SSR publicas, nao a UI do dono). Falta: na superficie do dono, controles para (a) ver e copiar o link publico da build, (b) regenerar o slug caso o link tenha vazado, (c) aviso claro de que renomear a build NAO muda o slug — o slug e imutavel por design (ACM-018), entao o link continua valido e o nome antigo permanece na URL. Sem isso o usuario nao tem como reagir a um link compartilhado por engano.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dono ve e copia o link publico da build
- [ ] #2 Dono consegue regenerar o slug; o slug antigo deixa de resolver
- [ ] #3 Renomear a build avisa que o slug/link nao muda
- [ ] #4 Regenerar slug exige sessao e valida ownership (mesmo padrao de authz das outras mutations)
- [ ] #5 Rate limit aplicado a regeneracao de slug
- [ ] #6 make check verde
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Review PR #78: LGTM.

ACs: #1 link visível/copiável (BuildShareStatus, condicional a isPublic) OK. #2 regenerar slug com confirmação explícita e aviso 'link atual vai parar de funcionar imediatamente' antes de confirmar OK. #3 aviso persistente de que renomear não muda o link, sempre visível (não há UI de rename nesta PR ainda, o aviso cobre o caso preventivamente) OK. #4 owner-only: getBuild e regenerateBuildSlug chamam requireSession() + loadOwnedBuild/where userId=session.user.id, teste 'user B cannot read/regenerate user A's build' cobre IDOR retornando BuildNotFoundError, e a página /builds/[id] mapeia esse erro para notFound() (404), nunca vaza dados) OK. #5 checkWriteRateLimit reaproveitado (mesmo limiter 30/min de todas as outras mutations), teste cobre estouro do limite OK.

Colisão de slug: novo slug usa generateSlug (nome + nanoid(8) random), mesmo padrão já usado em saveBuild/duplicate — não há checagem de unicidade explícita, mas é o padrão pré-existente no repo, não uma regressão introduzida por esta task.

Sem findings bloqueantes. CI verde.
<!-- SECTION:NOTES:END -->
