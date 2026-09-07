---
id: ACM-050
title: 'Migracoes: foreign_key_check roda apos o commit, viola sem rollback'
status: In Progress
assignee: []
created_date: '2026-09-07 19:08'
updated_date: '2026-09-07 19:56'
labels: []
dependencies: []
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Achado MEDIUM da review final da ACM-018 (PR #28). src/db/migrate.ts agora desabilita 'PRAGMA foreign_keys' em volta do table-rebuild (correcao correta e necessaria para o CRITICAL de cascade-delete), e roda 'PRAGMA foreign_key_check' depois, lancando erro se houver violacao. PROBLEMA: esse check roda DEPOIS que a transacao de migracao do drizzle ja commitou. Entao uma violacao e um alarme alto, nao um rollback — o banco fica meio-migrado, sem caminho de recuperacao automatico. E estritamente melhor que a perda silenciosa de dados anterior (por isso nao bloqueou o merge), mas o modo de falha precisa ser desenhado, nao herdado por acidente. Alem disso, o FK enforcement agora fica DESLIGADO para TODAS as migracoes, para sempre — nao so para a 0001. Autores de migracoes futuras precisam saber disso.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Modo de falha do foreign_key_check documentado em backlog decision para autores de migracoes futuras
- [ ] #2 Definida e implementada a estrategia de recuperacao: rollback manual, migracao de reparo, ou falha explicita no boot com instrucoes
- [ ] #3 Avaliado se o FK-off deve ser escopado apenas as migracoes que fazem table-rebuild, em vez de global
- [ ] #4 make check verde
<!-- AC:END -->
