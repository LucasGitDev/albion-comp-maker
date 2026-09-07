-- Two-step rebuild so pre-existing `builds` rows (any environment where a
-- build was inserted before this migration runs) get a valid, unique,
-- non-null `slug` instead of the migration crashing on
-- "Cannot add a NOT NULL column with default value NULL".
--
-- 1. Rebuild `builds` into a new table that already has the final shape
--    (slug NOT NULL, is_public, forked_from), backfilling `slug` from the
--    row's own `id` (already unique) for any row that existed before this
--    migration.
-- 2. Swap the rebuilt table in.
-- 3. Only then create the unique index on `slug` (index must come after
--    backfill, never before).
CREATE TABLE `__new_builds` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text,
	`content` text NOT NULL,
	`slug` text NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`forked_from` text REFERENCES builds(id),
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_builds` (`id`, `user_id`, `name`, `role`, `content`, `slug`, `is_public`, `forked_from`, `created_at`, `updated_at`)
SELECT `id`, `user_id`, `name`, `role`, `content`, `id`, false, NULL, `created_at`, `updated_at` FROM `builds`;
--> statement-breakpoint
DROP TABLE `builds`;
--> statement-breakpoint
ALTER TABLE `__new_builds` RENAME TO `builds`;
--> statement-breakpoint
CREATE UNIQUE INDEX `builds_slug_idx` ON `builds` (`slug`);
