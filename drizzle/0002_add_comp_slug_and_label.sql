-- `comp_builds.label` is nullable, so a plain ADD COLUMN is safe (no
-- default required, no rebuild needed).
ALTER TABLE `comp_builds` ADD `label` text;
--> statement-breakpoint
-- `comps.slug` must be NOT NULL + UNIQUE, so it needs the same two-step
-- rebuild-and-backfill pattern as migration 0001 did for `builds.slug`:
-- SQLite refuses `ALTER TABLE ... ADD COLUMN ... NOT NULL` without a
-- constant default ("Cannot add a NOT NULL column with default value
-- NULL"), and a constant default can't produce distinct, unique slugs for
-- pre-existing rows. Backfill from each row's own `id` (already unique)
-- instead, then add the unique index only after the backfill.
--
-- This rebuild DROPs the `comps` table; `comp_builds.comp_id` has
-- `ON DELETE CASCADE` to `comps.id`, so `src/db/migrate.ts` disabling FK
-- enforcement around migrations (and verifying with
-- `PRAGMA foreign_key_check` afterwards) is what keeps this from silently
-- wiping `comp_builds` rows — see `db-migrate.test.ts` for the regression
-- test covering exactly this.
CREATE TABLE `__new_comps` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`content_type` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_comps` (`id`, `user_id`, `name`, `slug`, `content_type`, `created_at`, `updated_at`)
SELECT `id`, `user_id`, `name`, `id`, `content_type`, `created_at`, `updated_at` FROM `comps`;
--> statement-breakpoint
DROP TABLE `comps`;
--> statement-breakpoint
ALTER TABLE `__new_comps` RENAME TO `comps`;
--> statement-breakpoint
CREATE UNIQUE INDEX `comps_slug_idx` ON `comps` (`slug`);
