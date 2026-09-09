---
id: ACM-107
title: Dockerize app para deploy no EasyPanel via Docker Hub
status: Done
assignee: []
created_date: '2026-09-09 16:27'
updated_date: '2026-09-09 16:39'
labels:
  - infra
  - ci
dependencies: []
priority: medium
ordinal: 105000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configurar pipeline de containerização para produção. EasyPanel na VPS puxa imagem do Docker Hub (lucasgitdev/albion-comp-maker). App usa Next.js standalone output, SQLite em volume persistente, e binários nativos (sharp, better-sqlite3).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dockerfile multi-stage (deps → builder → runner) baseado em node:22-alpine
- [ ] #2 .dockerignore exclui .git, node_modules, .env, .backlog, *.md
- [ ] #3 scripts/entrypoint.sh cria /app/data e subdiretórios, roda drizzle-kit migrate, depois exec node server.js
- [ ] #4 .github/workflows/docker-publish.yml faz build e push para lucasgitdev/albion-comp-maker:latest e :<sha> em todo push na main
- [ ] #5 docker build . conclui sem erro localmente
- [ ] #6 docker run com -v para /app/data sobe app na porta 3000 com migrations aplicadas
- [ ] #7 Workflow usa secrets DOCKERHUB_USERNAME e DOCKERHUB_TOKEN do GitHub
- [ ] #8 RATE_LIMIT_TRUSTED_HOPS=1 documentado como valor correto para topologia EasyPanel (1 proxy na frente)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
PR opened: #84. docker build + docker run com volume validados localmente. drizzle-kit migrate aplicado com sucesso no entrypoint. Encontrado bug pre-existente não relacionado (500 por conflito de slug dinâmico build/[id] vs build/[slug]), fora do escopo desta task, reproduzível também sem Docker.
<!-- SECTION:NOTES:END -->
