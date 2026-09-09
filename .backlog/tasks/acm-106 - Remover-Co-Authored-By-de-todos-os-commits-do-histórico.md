---
id: ACM-106
title: Remover Co-Authored-By de todos os commits do histórico
status: To Do
assignee: []
created_date: '2026-09-09 14:59'
labels: []
dependencies: []
priority: medium
ordinal: 104000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
26 de 50 commits têm trailer 'Co-Authored-By: Claude ...' injetado pelo harness. Política do projeto (CLAUDE.md) proíbe qualquer atribuição de IA em commits.

Hook global já configurado em ~/.config/git/hooks/prepare-commit-msg (strip automático daqui em diante).

Reescrever histórico com git-filter-repo para remover os trailers existentes.
<!-- SECTION:DESCRIPTION:END -->
