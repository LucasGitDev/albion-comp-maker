ALTER TABLE `builds` ADD `slug` text NOT NULL;--> statement-breakpoint
ALTER TABLE `builds` ADD `is_public` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `builds` ADD `forked_from` text REFERENCES builds(id);--> statement-breakpoint
CREATE UNIQUE INDEX `builds_slug_idx` ON `builds` (`slug`);