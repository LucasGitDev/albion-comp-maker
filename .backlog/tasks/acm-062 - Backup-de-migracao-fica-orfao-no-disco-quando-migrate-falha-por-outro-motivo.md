---
id: ACM-062
title: Backup de migracao fica orfao no disco quando migrate() falha por outro motivo
status: To Do
assignee: []
created_date: '2026-09-07 20:07'
labels: []
dependencies: []
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado LOW da review da ACM-050 (PR #39). Se migrate() lancar por um motivo NAO relacionado ao foreign_key_check, o arquivo <db>.pre-migration-backup permanece no disco. E inofensivo do ponto de vista de dados, mas confunde um operador diagnosticando falha de boot: a presenca do backup sugere que houve violacao de FK e restore, quando na verdade a falha foi outra. Limpar o backup no caminho de erro nao-FK, ou renomear para deixar claro o motivo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Backup e removido (ou renomeado com motivo explicito) quando migrate() falha por causa nao relacionada a FK
- [ ] #2 O caminho de restore por violacao de FK continua preservando o backup ate concluir
- [ ] #3 make check verde
<!-- AC:END -->
