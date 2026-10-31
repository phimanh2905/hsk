CREATE TABLE `reading_progress` (
	`user_id` text NOT NULL,
	`reading_id` text NOT NULL,
	`correct` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`completed_at` text,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `reading_id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reading_progress_user_idx` ON `reading_progress` (`user_id`);