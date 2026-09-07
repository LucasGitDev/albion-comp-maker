---
id: ACM-052
title: Remover .vitest/json/output.json do controle de versao
status: In Progress
assignee: []
created_date: '2026-09-07 19:08'
updated_date: '2026-09-07 19:08'
labels: []
dependencies: []
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Higiene de repo, achado LOW da review da ACM-044 (PR #30). .vitest/json/output.json e um artefato de execucao de teste mas esta rastreado no git. Ja causou atrito real: durante a ACM-018 ele apareceu como mudanca nao-staged e bloqueou um rebase, e na ACM-044 o implementer precisou reverter o artefato manualmente antes do commit. Cada rodada de teste suja a arvore de trabalho. Adicionar ao .gitignore e remover do indice com 'git rm --cached'.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 .vitest/ adicionado ao .gitignore
- [ ] #2 output.json removido do indice com git rm --cached (sem deletar o arquivo local)
- [ ] #3 Rodar a suite de testes deixa a arvore de trabalho limpa
- [ ] #4 make check verde
<!-- AC:END -->
