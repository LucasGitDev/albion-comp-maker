---
id: ACM-061
title: >-
  Backup de migracao usa caminho fixo — risco de restore errado com workers
  concorrentes
status: To Do
assignee: []
created_date: '2026-09-07 20:07'
updated_date: '2026-09-09 03:07'
labels: []
dependencies: []
priority: low
ordinal: 61000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da review da ACM-050 (PR #39). src/db/migrate.ts grava o snapshot pre-migracao num caminho FIXO (<db>.pre-migration-backup), sem pid, sem uuid, sem lock. O Next.js pode iniciar varios worker processes, e src/instrumentation.ts chama runMigrations() em cada um. Na janela de boot de uma migracao com rebuild, dois processos podem correr snapshot/restore sobre o MESMO arquivo: o worker A tira o snapshot, o worker B sobrescreve, e um restore pode reverter para o estado errado. E uma corrida de baixa probabilidade mas com consequencia alta — o mecanismo de recuperacao restaurando dados errados e pior que nao ter recuperacao. Sugestao do reviewer: sufixo uuid no nome do backup, ou lock consultivo em arquivo, ou garantir que so um processo roda migracao.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Nome do arquivo de backup e unico por execucao (uuid/pid) OU existe lock impedindo snapshot/restore concorrente
- [ ] #2 Dois processos rodando runMigrations() simultaneamente nao podem restaurar o snapshot um do outro
- [ ] #3 Teste cobrindo o cenario concorrente
- [ ] #4 make check verde
<!-- AC:END -->
