---
id: ACM-050
title: 'Migracoes: foreign_key_check roda apos o commit, viola sem rollback'
status: In Progress
assignee: []
created_date: '2026-09-07 19:08'
updated_date: '2026-09-07 20:02'
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented scoped FK-off + backup/restore recovery for migrate.ts.

- pendingMigrationsNeedFkOff() inspects the migration journal against
  __drizzle_migrations to determine if any migration NOT YET applied
  contains a DROP TABLE (proxy for a table-rebuild migration). FK
  enforcement is only suspended for that run if so — a plain future
  migration (ADD COLUMN etc.) runs with FK enforcement ON the whole time
  and gets automatic transaction rollback from drizzle/SQLite itself on
  any violation.
- Investigated moving foreign_key_check inside drizzle's migration
  transaction to get a true ROLLBACK: not possible without reimplementing
  drizzle-orm's SQLiteSyncDialect.migrate (BEGIN/loop/COMMIT is internal,
  no hook exposed, depends on an unexported migrator module). Evidence in
  decision-014.
- Recovery strategy implemented instead: when FK-off is needed, take a
  file-level snapshot (WAL checkpoint + fs.copyFileSync) before migrate().
  If foreign_key_check finds violations after commit, close the connection,
  restore the db file from the snapshot, and throw — refusing to leave the
  process running against a half-migrated database. src/instrumentation.ts
  calls runMigrations() uncaught on boot, so this throw prevents the app
  from starting. Backup is deleted on a clean run, kept (not deleted) on
  failure for operator inspection.
- decision-014 documents both the scoping rationale and the recovery
  design for future migration authors.
- New tests: simulates a broken rebuild migration that leaves comp_builds
  dangling, asserts runMigrations throws and the db file is restored
  byte-for-byte; and asserts a plain migration after 0001/0002 are applied
  does not trigger the backup path.
<!-- SECTION:NOTES:END -->
