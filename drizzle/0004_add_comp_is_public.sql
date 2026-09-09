-- Adds `comps.is_public` (ACM-066, decision-025) as a plain `ADD COLUMN`
-- with a constant default, NOT a table rebuild. SQLite allows `ADD COLUMN
-- ... NOT NULL DEFAULT <constant>` without recreating the table, so this
-- migration never emits `CREATE TABLE __new_comps` / `DROP TABLE comps`
-- (unlike 0001's builds-table rebuild). Because there is no pending
-- rebuild here, `pendingMigrationsNeedFkOff` in `src/db/migrate.ts` still
-- returns false for this migration and the batch runs with foreign keys
-- ON the whole time (decision-014) — nothing to change in `migrate.ts`.
--
-- The backfill below only marks `is_public = 1` for comps that are
-- ALREADY publicly reachable today under the derived rule from
-- decision-015 (has at least one build, and none of its builds are
-- private): it never grants new reachability, only preserves links that
-- were already live before this flag existed. Every other comp (no
-- builds, or any private build) stays at the column default of 0.
ALTER TABLE `comps` ADD `is_public` integer DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE `comps` SET `is_public` = true
WHERE EXISTS (SELECT 1 FROM `comp_builds` WHERE `comp_builds`.`comp_id` = `comps`.`id`)
  AND NOT EXISTS (
    SELECT 1 FROM `comp_builds`
    JOIN `builds` ON `builds`.`id` = `comp_builds`.`build_id`
    WHERE `comp_builds`.`comp_id` = `comps`.`id` AND `builds`.`is_public` = false
  );
