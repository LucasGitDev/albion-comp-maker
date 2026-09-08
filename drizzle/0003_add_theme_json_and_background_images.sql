CREATE TABLE `background_images` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`file_name` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `background_images_user_id_idx` ON `background_images` (`user_id`);--> statement-breakpoint
ALTER TABLE `builds` ADD `theme_json` text;